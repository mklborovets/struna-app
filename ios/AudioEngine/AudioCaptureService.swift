import AVFoundation
import Foundation

@_silgen_name("StrunaIosPushAudioSamples")
func StrunaIosPushAudioSamples(_ samples: UnsafePointer<Float>, _ count: Int32)

@_silgen_name("StrunaIosRenderMetronomeBlock")
func StrunaIosRenderMetronomeBlock(_ outputSamples: UnsafeMutablePointer<Float>, _ frameCount: Int32)

@_silgen_name("StrunaIosSetSampleRate")
func StrunaIosSetSampleRate(_ sampleRateHz: Float)

@_silgen_name("StrunaIosResetEngine")
func StrunaIosResetEngine()

@objc(StrunaAudioCaptureService)
public final class AudioCaptureService: NSObject {
    @objc public static let shared = AudioCaptureService()

    private let audioEngine = AVAudioEngine()
    private let sessionQueue = DispatchQueue(label: "com.struna.audio.session", qos: .userInteractive)
    private var metronomeSourceNode: AVAudioSourceNode?
    private var isTapInstalled = false
    private var isRunning = false
    private var shouldResumeAfterInterruption = false

    private override init() {
        super.init()
        registerInterruptionObservers()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc public func startCapture() -> Bool {
        var started = false
        sessionQueue.sync {
            started = self.startCaptureSynchronized()
        }
        return started
    }

    @objc public func stopCapture() {
        sessionQueue.sync {
            self.shouldResumeAfterInterruption = false
            self.stopCaptureSynchronized()
        }
    }

    private func startCaptureSynchronized() -> Bool {
        if isRunning {
            return true
        }

        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .measurement,
                options: [.defaultToSpeaker, .allowBluetooth]
            )
            try session.setPreferredSampleRate(48000.0)
            try session.setPreferredIOBufferDuration(0.010)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            return false
        }
        #endif

        let inputNode = audioEngine.inputNode
        let hardwareFormat = inputNode.inputFormat(forBus: 0)
        guard hardwareFormat.sampleRate > 0, hardwareFormat.channelCount > 0 else {
            return false
        }

        StrunaIosSetSampleRate(Float(hardwareFormat.sampleRate))

        if isTapInstalled {
            inputNode.removeTap(onBus: 0)
            isTapInstalled = false
        }

        inputNode.installTap(
            onBus: 0,
            bufferSize: 512,
            format: hardwareFormat
        ) { buffer, _ in
            guard let channelData = buffer.floatChannelData else {
                return
            }
            let frameLength = Int32(buffer.frameLength)
            if frameLength > 0 {
                StrunaIosPushAudioSamples(channelData[0], frameLength)
            }
        }
        isTapInstalled = true

        attachMetronomeSourceNodeIfNeeded(sampleRate: hardwareFormat.sampleRate)

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isRunning = true
            return true
        } catch {
            if isTapInstalled {
                inputNode.removeTap(onBus: 0)
                isTapInstalled = false
            }
            return false
        }
    }

    private func attachMetronomeSourceNodeIfNeeded(sampleRate: Double) {
        if metronomeSourceNode != nil {
            return
        }
        guard let renderFormat = AVAudioFormat(
            standardFormatWithSampleRate: sampleRate,
            channels: 1
        ) else {
            return
        }
        let sourceNode = AVAudioSourceNode(format: renderFormat) { _, _, frameCount, audioBufferList -> OSStatus in
            let ablPointer = UnsafeMutableAudioBufferListPointer(audioBufferList)
            guard let firstBuffer = ablPointer.first,
                  let dataPtr = firstBuffer.mData?.assumingMemoryBound(to: Float.self) else {
                return noErr
            }
            StrunaIosRenderMetronomeBlock(dataPtr, Int32(frameCount))
            return noErr
        }
        audioEngine.attach(sourceNode)
        audioEngine.connect(sourceNode, to: audioEngine.mainMixerNode, format: renderFormat)
        metronomeSourceNode = sourceNode
    }

    private func stopCaptureSynchronized() {
        if isTapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            isTapInstalled = false
        }
        if let sourceNode = metronomeSourceNode {
            audioEngine.detach(sourceNode)
            metronomeSourceNode = nil
        }
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        isRunning = false
        StrunaIosResetEngine()

        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(
            false,
            options: .notifyOthersOnDeactivation
        )
        #endif
    }

    private func registerInterruptionObservers() {
        #if os(iOS)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioSessionInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange(_:)),
            name: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance()
        )
        #endif
    }

    @objc private func handleAudioSessionInterruption(_ notification: Notification) {
        #if os(iOS)
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let interruptionType = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        sessionQueue.async {
            switch interruptionType {
            case .began:
                if self.isRunning {
                    self.shouldResumeAfterInterruption = true
                    self.stopCaptureSynchronized()
                }
            case .ended:
                let optionsValue =
                    (userInfo[AVAudioSessionInterruptionOptionKey] as? UInt) ?? 0
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                if self.shouldResumeAfterInterruption && options.contains(.shouldResume) {
                    self.shouldResumeAfterInterruption = false
                    _ = self.startCaptureSynchronized()
                }
            @unknown default:
                break
            }
        }
        #endif
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        #if os(iOS)
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        if reason == .oldDeviceUnavailable || reason == .newDeviceAvailable {
            sessionQueue.async {
                if self.isRunning {
                    self.stopCaptureSynchronized()
                    _ = self.startCaptureSynchronized()
                }
            }
        }
        #endif
    }
}
