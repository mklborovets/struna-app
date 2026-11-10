import AVFoundation
import Foundation

@_silgen_name("StrunaIosPushAudioSamples")
func StrunaIosPushAudioSamples(_ samples: UnsafePointer<Float>, _ count: Int32)

@_silgen_name("StrunaIosRenderMetronomeBlock")
func StrunaIosRenderMetronomeBlock(_ output: UnsafeMutablePointer<Float>, _ count: Int32) -> Bool

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
    private var isCaptureActive = false
    private var isMetronomeActive = false
    private var isEngineRunning = false
    private var shouldResumeCaptureAfterInterruption = false
    private var shouldResumeMetronomeAfterInterruption = false

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
            self.isCaptureActive = true
            started = self.reconfigureEngineSynchronized()
            if !started {
                self.isCaptureActive = false
            }
        }
        return started
    }

    @objc public func stopCapture() {
        sessionQueue.sync {
            self.shouldResumeCaptureAfterInterruption = false
            self.isCaptureActive = false
            StrunaIosResetEngine()
            _ = self.reconfigureEngineSynchronized()
        }
    }

    @objc public func setMetronomeActive(_ active: Bool) {
        sessionQueue.async {
            if !active {
                self.shouldResumeMetronomeAfterInterruption = false
            }
            self.isMetronomeActive = active
            _ = self.reconfigureEngineSynchronized()
        }
    }

    private func reconfigureEngineSynchronized() -> Bool {
        let needsEngine = isCaptureActive || isMetronomeActive

        if !needsEngine {
            tearDownEngineSynchronized()
            return true
        }

        if isTapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            isTapInstalled = false
        }
        if audioEngine.isRunning {
            audioEngine.stop()
            isEngineRunning = false
        }
        if let existingSource = metronomeSourceNode {
            audioEngine.detach(existingSource)
            metronomeSourceNode = nil
        }

        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        do {
            if isCaptureActive {
                try session.setCategory(
                    .playAndRecord,
                    mode: .measurement,
                    options: [.defaultToSpeaker, .allowBluetooth]
                )
            } else {
                try session.setCategory(
                    .playback,
                    mode: .default,
                    options: [.mixWithOthers]
                )
            }
            try session.setPreferredSampleRate(48000.0)
            try session.setPreferredIOBufferDuration(0.010)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            if isCaptureActive {
                let isUsingReceiver = session.currentRoute.outputs.contains {
                    $0.portType == .builtInReceiver
                }
                if isUsingReceiver {
                    try? session.overrideOutputAudioPort(.speaker)
                }
            }
        } catch {
            return false
        }
        #endif

        var resolvedSampleRate: Double = 48000.0

        if isCaptureActive {
            let inputNode = audioEngine.inputNode
            let hardwareFormat = inputNode.inputFormat(forBus: 0)
            guard hardwareFormat.sampleRate > 0, hardwareFormat.channelCount > 0 else {
                return false
            }
            resolvedSampleRate = hardwareFormat.sampleRate

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
        } else {
            let outputFormat = audioEngine.outputNode.outputFormat(forBus: 0)
            if outputFormat.sampleRate > 0 {
                resolvedSampleRate = outputFormat.sampleRate
            }
        }

        StrunaIosSetSampleRate(Float(resolvedSampleRate))
        attachMetronomeNode(sampleRate: resolvedSampleRate)

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isEngineRunning = true
            return true
        } catch {
            if isTapInstalled {
                audioEngine.inputNode.removeTap(onBus: 0)
                isTapInstalled = false
            }
            isEngineRunning = false
            return false
        }
    }

    private func attachMetronomeNode(sampleRate: Double) {
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
            let frameLength = Int(frameCount)
            let rendered = StrunaIosRenderMetronomeBlock(dataPtr, Int32(frameCount))
            if !rendered {
                for i in 0..<frameLength {
                    dataPtr[i] = 0.0
                }
            }
            if ablPointer.count > 1 {
                for bufIdx in 1..<ablPointer.count {
                    if let chPtr = ablPointer[bufIdx].mData?.assumingMemoryBound(to: Float.self) {
                        for i in 0..<frameLength {
                            chPtr[i] = dataPtr[i]
                        }
                    }
                }
            }
            return noErr
        }

        sourceNode.volume = 1.0
        audioEngine.mainMixerNode.outputVolume = 1.0
        audioEngine.attach(sourceNode)
        audioEngine.connect(sourceNode, to: audioEngine.mainMixerNode, format: renderFormat)
        audioEngine.connect(audioEngine.mainMixerNode, to: audioEngine.outputNode, format: nil)
        metronomeSourceNode = sourceNode
    }

    private func tearDownEngineSynchronized() {
        if isTapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            isTapInstalled = false
        }
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        isEngineRunning = false
        if let existingSource = metronomeSourceNode {
            audioEngine.detach(existingSource)
            metronomeSourceNode = nil
        }
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
                if self.isEngineRunning {
                    self.shouldResumeCaptureAfterInterruption = self.isCaptureActive
                    self.shouldResumeMetronomeAfterInterruption = self.isMetronomeActive
                    self.isCaptureActive = false
                    self.isMetronomeActive = false
                    self.tearDownEngineSynchronized()
                }
            case .ended:
                let optionsValue =
                    (userInfo[AVAudioSessionInterruptionOptionKey] as? UInt) ?? 0
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                if options.contains(.shouldResume) &&
                    (self.shouldResumeCaptureAfterInterruption || self.shouldResumeMetronomeAfterInterruption) {
                    self.isCaptureActive = self.shouldResumeCaptureAfterInterruption
                    self.isMetronomeActive = self.shouldResumeMetronomeAfterInterruption
                    self.shouldResumeCaptureAfterInterruption = false
                    self.shouldResumeMetronomeAfterInterruption = false
                    _ = self.reconfigureEngineSynchronized()
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
                if self.isCaptureActive || self.isMetronomeActive {
                    _ = self.reconfigureEngineSynchronized()
                }
            }
        }
        #endif
    }
}
