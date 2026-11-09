#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include "AudioTypes.hpp"

namespace struna {

template <
    std::size_t FftSize = 512,
    std::size_t BinCount = kDefaultSpectrumBinCount,
    std::size_t WaveformSize = kDefaultWaveformSnapshotSize>
class SpectrumAnalyzer {
    static_assert((FftSize != 0) && ((FftSize & (FftSize - 1)) == 0),
                  "FftSize must be a power of two");

public:
    static constexpr float kTwoPi = 6.28318530717958647692f;

    SpectrumAnalyzer() noexcept {
        for (std::size_t i = 0; i < FftSize; ++i) {
            hannWindow_[i] =
                0.5f * (1.0f - std::cos(kTwoPi * static_cast<float>(i) /
                                        static_cast<float>(FftSize - 1)));
        }
        real_.fill(0.0f);
        imag_.fill(0.0f);
    }

    void computeFrame(
        const float* samples,
        std::size_t sampleCount,
        SpectrumFrame& outFrame) noexcept {
        if (samples == nullptr || sampleCount == 0) {
            outFrame.magnitudes.fill(0.0f);
            outFrame.waveform.fill(0.0f);
            return;
        }

        extractWaveform(samples, sampleCount, outFrame);

        const std::size_t copyCount = std::min(sampleCount, FftSize);
        for (std::size_t i = 0; i < copyCount; ++i) {
            real_[i] = samples[i] * hannWindow_[i];
            imag_[i] = 0.0f;
        }
        for (std::size_t i = copyCount; i < FftSize; ++i) {
            real_[i] = 0.0f;
            imag_[i] = 0.0f;
        }

        executeInPlaceRadix2Fft();

        const std::size_t usableBins = FftSize / 4;
        const std::size_t binsPerGroup = std::max<std::size_t>(1, usableBins / BinCount);
        const float normalizationFactor = 2.0f / static_cast<float>(FftSize);

        for (std::size_t b = 0; b < BinCount; ++b) {
            float maxMag = 0.0f;
            const std::size_t startIdx = 1 + b * binsPerGroup;
            const std::size_t endIdx = std::min(FftSize / 2, startIdx + binsPerGroup);
            for (std::size_t k = startIdx; k < endIdx; ++k) {
                const float mag =
                    std::sqrt(real_[k] * real_[k] + imag_[k] * imag_[k]) *
                    normalizationFactor;
                if (mag > maxMag) {
                    maxMag = mag;
                }
            }
            const float dbScaled =
                maxMag > 1.0e-4f ? std::clamp((20.0f * std::log10(maxMag) + 60.0f) / 60.0f, 0.0f, 1.0f) : 0.0f;
            outFrame.magnitudes[b] = dbScaled;
        }
    }

    void extractWaveform(
        const float* samples,
        std::size_t sampleCount,
        SpectrumFrame& outFrame) const noexcept {
        if (samples == nullptr || sampleCount == 0) {
            outFrame.waveform.fill(0.0f);
            return;
        }
        for (std::size_t i = 0; i < WaveformSize; ++i) {
            const std::size_t sampleIdx =
                (i * sampleCount) / WaveformSize;
            outFrame.waveform[i] =
                std::clamp(samples[ std::min(sampleIdx, sampleCount - 1) ], -1.0f, 1.0f);
        }
    }

private:
    void executeInPlaceRadix2Fft() noexcept {
        std::size_t j = 0;
        for (std::size_t i = 0; i < FftSize; ++i) {
            if (i < j) {
                std::swap(real_[i], real_[j]);
                std::swap(imag_[i], imag_[j]);
            }
            std::size_t bit = FftSize >> 1;
            while (bit > 0 && (j & bit) != 0) {
                j ^= bit;
                bit >>= 1;
            }
            j |= bit;
        }

        for (std::size_t len = 2; len <= FftSize; len <<= 1) {
            const float angle = -kTwoPi / static_cast<float>(len);
            const float wlenReal = std::cos(angle);
            const float wlenImag = std::sin(angle);
            const std::size_t halfLen = len >> 1;

            for (std::size_t i = 0; i < FftSize; i += len) {
                float wReal = 1.0f;
                float wImag = 0.0f;
                for (std::size_t k = 0; k < halfLen; ++k) {
                    const std::size_t evenIdx = i + k;
                    const std::size_t oddIdx = i + k + halfLen;

                    const float uReal = real_[evenIdx];
                    const float uImag = imag_[evenIdx];
                    const float vReal =
                        real_[oddIdx] * wReal - imag_[oddIdx] * wImag;
                    const float vImag =
                        real_[oddIdx] * wImag + imag_[oddIdx] * wReal;

                    real_[evenIdx] = uReal + vReal;
                    imag_[evenIdx] = uImag + vImag;
                    real_[oddIdx] = uReal - vReal;
                    imag_[oddIdx] = uImag - vImag;

                    const float nextWReal = wReal * wlenReal - wImag * wlenImag;
                    const float nextWImag = wReal * wlenImag + wImag * wlenReal;
                    wReal = nextWReal;
                    wImag = nextWImag;
                }
            }
        }
    }

    std::array<float, FftSize> hannWindow_;
    std::array<float, FftSize> real_;
    std::array<float, FftSize> imag_;
};

}
