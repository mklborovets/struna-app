package com.struna.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Process
import android.util.Log
import java.util.concurrent.atomic.AtomicBoolean

class AudioCaptureThread(
    private val requestedSampleRateHz: Int = 48000,
    private val frameBlockSize: Int = 512,
    private val onSamplesCaptured: (FloatArray, Int) -> Unit,
    private val onSampleRateResolved: (Int) -> Unit
) {
    companion object {
        private const val TAG = "StrunaAudioCapture"
    }

    private val isRunning = AtomicBoolean(false)
    private var workerThread: Thread? = null

    private data class RecorderConfig(
        val record: AudioRecord,
        val isFloatEncoding: Boolean,
        val sampleRate: Int
    )

    fun start(): Boolean {
        if (isRunning.get()) {
            return true
        }
        val config = createOptimalAudioRecord()
        if (config == null) {
            Log.e(TAG, "Failed to initialize AudioRecord with any configuration")
            return false
        }
        val recorder = config.record
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord state is not STATE_INITIALIZED: ${recorder.state}")
            recorder.release()
            return false
        }

        val actualSampleRate = recorder.sampleRate
        Log.i(
            TAG,
            "AudioRecord initialized: sampleRate=$actualSampleRate, isFloat=${config.isFloatEncoding}, source=${recorder.audioSource}"
        )
        onSampleRateResolved(actualSampleRate)
        isRunning.set(true)

        workerThread = Thread({
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
            val floatBuffer = FloatArray(frameBlockSize)
            val shortBuffer = if (!config.isFloatEncoding) ShortArray(frameBlockSize) else null

            try {
                recorder.startRecording()
                Log.i(TAG, "AudioRecord started recording")
                while (isRunning.get() && !Thread.currentThread().isInterrupted) {
                    val samplesRead = if (config.isFloatEncoding) {
                        recorder.read(
                            floatBuffer,
                            0,
                            frameBlockSize,
                            AudioRecord.READ_BLOCKING
                        )
                    } else {
                        val shortsRead = recorder.read(
                            shortBuffer!!,
                            0,
                            frameBlockSize,
                            AudioRecord.READ_BLOCKING
                        )
                        if (shortsRead > 0) {
                            for (i in 0 until shortsRead) {
                                floatBuffer[i] = shortBuffer[i] / 32768.0f
                            }
                        }
                        shortsRead
                    }

                    if (samplesRead > 0) {
                        onSamplesCaptured(floatBuffer, samplesRead)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Audio capture loop interrupted: ${e.message}")
                isRunning.set(false)
            } finally {
                try {
                    if (recorder.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                        recorder.stop()
                    }
                } catch (_: IllegalStateException) {
                }
                recorder.release()
                Log.i(TAG, "AudioRecord released")
            }
        }, "StrunaAudioCaptureThread").apply {
            isDaemon = true
            start()
        }

        return true
    }

    fun stop() {
        if (!isRunning.compareAndSet(true, false)) {
            return
        }
        workerThread?.interrupt()
        try {
            workerThread?.join(300)
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
        }
        workerThread = null
    }

    fun isCapturing(): Boolean = isRunning.get()

    @SuppressLint("MissingPermission")
    private fun createOptimalAudioRecord(): RecorderConfig? {
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val sampleRates = intArrayOf(requestedSampleRateHz, 44100, 16000)
        val encodings = intArrayOf(
            AudioFormat.ENCODING_PCM_16BIT,
            AudioFormat.ENCODING_PCM_FLOAT
        )
        val audioSources = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            intArrayOf(
                MediaRecorder.AudioSource.MIC,
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MediaRecorder.AudioSource.DEFAULT,
                MediaRecorder.AudioSource.UNPROCESSED
            )
        } else {
            intArrayOf(
                MediaRecorder.AudioSource.MIC,
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MediaRecorder.AudioSource.DEFAULT
            )
        }

        for (sampleRate in sampleRates) {
            for (encoding in encodings) {
                val minBufferBytes = AudioRecord.getMinBufferSize(
                    sampleRate,
                    channelConfig,
                    encoding
                )
                if (minBufferBytes <= 0) {
                    continue
                }

                val bytesPerSample = if (encoding == AudioFormat.ENCODING_PCM_FLOAT) 4 else 2
                val frameBufferBytes = frameBlockSize * bytesPerSample * 2
                val bufferSizeInBytes = maxOf(minBufferBytes, frameBufferBytes)

                for (source in audioSources) {
                    try {
                        val candidate = AudioRecord(
                            source,
                            sampleRate,
                            channelConfig,
                            encoding,
                            bufferSizeInBytes
                        )
                        if (candidate.state == AudioRecord.STATE_INITIALIZED) {
                            return RecorderConfig(
                                record = candidate,
                                isFloatEncoding = (encoding == AudioFormat.ENCODING_PCM_FLOAT),
                                sampleRate = sampleRate
                            )
                        }
                        candidate.release()
                    } catch (_: IllegalArgumentException) {
                    } catch (_: SecurityException) {
                        return null
                    }
                }
            }
        }
        return null
    }
}
