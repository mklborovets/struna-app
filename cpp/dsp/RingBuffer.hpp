#pragma once
#include <algorithm>
#include <array>
#include <atomic>
#include <cstddef>

namespace struna {

template <std::size_t Capacity = 8192>
class RingBuffer {
    static_assert((Capacity != 0) && ((Capacity & (Capacity - 1)) == 0),
                  "Capacity must be a power of two");

public:
    RingBuffer() noexcept : writeCursor_(0), readCursor_(0), totalWritten_(0) {
        for (std::size_t i = 0; i < Capacity; ++i) {
            storage_[i].store(0.0f, std::memory_order_relaxed);
        }
    }

    std::size_t availableToRead() const noexcept {
        const std::size_t writePos = writeCursor_.load(std::memory_order_acquire);
        const std::size_t readPos = readCursor_.load(std::memory_order_acquire);
        return writePos >= readPos ? (writePos - readPos) : 0;
    }

    std::size_t availableToWrite() const noexcept {
        const std::size_t used = availableToRead();
        return used < Capacity ? (Capacity - used) : 0;
    }

    std::size_t write(const float* source, std::size_t count) noexcept {
        if (source == nullptr || count == 0) {
            return 0;
        }
        const std::size_t writePos = writeCursor_.load(std::memory_order_relaxed);
        const std::size_t readPos = readCursor_.load(std::memory_order_acquire);
        const std::size_t used = writePos >= readPos ? (writePos - readPos) : 0;
        const std::size_t freeSlots = used < Capacity ? (Capacity - used) : 0;
        const std::size_t itemsToWrite = std::min(count, freeSlots);

        for (std::size_t i = 0; i < itemsToWrite; ++i) {
            storage_[(writePos + i) & kIndexMask].store(
                source[i],
                std::memory_order_relaxed);
        }

        writeCursor_.store(writePos + itemsToWrite, std::memory_order_release);
        totalWritten_.fetch_add(itemsToWrite, std::memory_order_release);
        return itemsToWrite;
    }

    void pushOverwrite(const float* source, std::size_t count) noexcept {
        if (source == nullptr || count == 0) {
            return;
        }
        std::size_t writePos = writeCursor_.load(std::memory_order_relaxed);
        const std::size_t readPos = readCursor_.load(std::memory_order_acquire);

        for (std::size_t i = 0; i < count; ++i) {
            storage_[(writePos + i) & kIndexMask].store(
                source[i],
                std::memory_order_relaxed);
        }

        writePos += count;
        if (writePos > readPos && (writePos - readPos) > Capacity) {
            readCursor_.store(writePos - Capacity, std::memory_order_release);
        }
        writeCursor_.store(writePos, std::memory_order_release);
        totalWritten_.fetch_add(count, std::memory_order_release);
    }

    std::size_t read(float* destination, std::size_t count) noexcept {
        if (destination == nullptr || count == 0) {
            return 0;
        }
        const std::size_t readPos = readCursor_.load(std::memory_order_relaxed);
        const std::size_t writePos = writeCursor_.load(std::memory_order_acquire);
        const std::size_t available = writePos >= readPos ? (writePos - readPos) : 0;
        const std::size_t itemsToRead = std::min(count, available);

        for (std::size_t i = 0; i < itemsToRead; ++i) {
            destination[i] = storage_[(readPos + i) & kIndexMask].load(
                std::memory_order_relaxed);
        }

        readCursor_.store(readPos + itemsToRead, std::memory_order_release);
        return itemsToRead;
    }

    bool copyLatestWindow(float* destination, std::size_t windowSize) const noexcept {
        if (destination == nullptr || windowSize == 0 || windowSize > Capacity) {
            return false;
        }
        const std::size_t written = totalWritten_.load(std::memory_order_acquire);
        if (written < windowSize) {
            return false;
        }
        const std::size_t writePos = writeCursor_.load(std::memory_order_acquire);
        if (writePos < windowSize) {
            return false;
        }
        const std::size_t startPos = writePos - windowSize;
        for (std::size_t i = 0; i < windowSize; ++i) {
            destination[i] = storage_[(startPos + i) & kIndexMask].load(
                std::memory_order_relaxed);
        }
        return true;
    }

    void clear() noexcept {
        writeCursor_.store(0, std::memory_order_release);
        readCursor_.store(0, std::memory_order_release);
        totalWritten_.store(0, std::memory_order_release);
    }

private:
    static constexpr std::size_t kIndexMask = Capacity - 1;
    std::array<std::atomic<float>, Capacity> storage_;
    std::atomic<std::size_t> writeCursor_;
    std::atomic<std::size_t> readCursor_;
    std::atomic<std::size_t> totalWritten_;
};

}
