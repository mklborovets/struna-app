## 1. Правила кодової бази (Code Conventions)

У проєкті діють суворі обмеження якості коду, які перевіряються на рівні лінтера та Code Review:

1. **Повна заборона коментарів у коді:** У файлах `.ts`, `.tsx`, `.cpp`, `.hpp`, `.kt`, `.swift` заборонено використовувати однорядкові або багаторядкові коментарі. Якщо блок коду потребує пояснення — його потрібно винести в окрему функцію з промовистою назвою або розбити на іменовані константи.
2. **Повна заборона емодзі та текстових символів у UI:** Жодних юнікод-символів чи емодзі в коді або інтерфейсі. Уся графіка реалізується виключно через строгі SVG-компоненти в `src/shared/ui/icons/`.
3. **Повна ізоляція UI від бізнес-логіки (Headless Architecture):**
* **Сегмент `ui/`:** Містить тільки JSX-розмітку, стилі (`StyleSheet`) та прив'язку анімованих стилів. У файлах `ui/` заборонені обчислення, робота з JSI, таймери, запити до бази даних або складні `useEffect`.
* **Сегмент `model/`:** Містить усю логіку слайсу — хуки стану, підписки на аудіо-потік, Reanimated SharedValues та скінченні автомати.
* **Сегмент `lib/`:** Містить чисті детерміновані функції (математика перерахунку частот, форматування), які не залежать від React або життєвого циклу компонентів.


4. **Суворе дотримання Feature-Sliced Design (FSD):** Імпорти дозволені виключно зверху вниз: `app` $\to$ `pages` $\to$ `widgets` $\to$ `features` $\to$ `entities` $\to$ `shared`. Кросс-імпорти між слайсами одного шару (наприклад, імпорт із `features/calibrate-a4` у `features/select-tuning`) заборонені. Ззовні слайсу доступний тільки його публічний API через `index.ts`.

---

## 2. Повна карта директорій та відповідальність файлів

```text
struna/
├── cpp/                                              
│   ├── dsp/
│   │   ├── AudioTypes.hpp                            # Структури PitchFrame, SpectrumFrame
│   │   ├── RingBuffer.hpp                            # Lock-free SPSC кільцевий буфер без алокацій
│   │   ├── RmsGate.hpp                               # Відсікання тиші та фонового шуму у дБ
│   │   ├── AutocorrelationDetector.hpp               # Базовий алгоритм для демонстрації октавних помилок
│   │   ├── YinDetector.hpp                           # Оголошення класу алгоритму YIN
│   │   ├── YinDetector.cpp                           # Реалізація YIN + параболічна інтерполяція
│   │   ├── PitchStabilizer.hpp                       # Оголошення медіанного фільтра та трекера атаки
│   │   ├── PitchStabilizer.cpp                       # Фільтрація стрибків та відсікання перших 80 мс атаки
│   │   ├── SpectrumAnalyzer.hpp                      # Швидке віконне перетворення для візуалізації спектра
│   │   └── MetronomeScheduler.hpp                    # Генератор семплів кліку метронома в аудіо-потоці
│   ├── jsi/
│   │   ├── StrunaHostObject.hpp                      # JSI-інтерфейс для доступу з JS без мосту
│   │   └── StrunaHostObject.cpp                      # Мапінг C++ методів у глобальний об'єкт JS Runtime
│   └── tests/
│       ├── CMakeLists.txt                            # Конфігурація збірки автономних тестів на ПК
│       ├── SyntheticSignalGenerator.hpp              # Генератор чистих синусів, гармонік та шуму
│       └── YinDetectorTests.cpp                      # Юніт-тести точності (±1 цент) та імунітету до гармонік
├── android/app/src/main/
│   ├── cpp/
│   │   ├── CMakeLists.txt                            # Збірка C++ ядра в бібліотеку libstruna.so
│   │   └── JniBridge.cpp                             # Ініціалізація JSI та прийом буфера з Kotlin
│   └── java/com/struna/audio/
│       ├── AudioCaptureThread.kt                     # Потік AudioRecord з URGENT_AUDIO пріоритетом
│       ├── AudioFocusManager.kt                      # Обробка вхідних дзвінків та втрати фокусу мікрофона
│       └── StrunaPackage.kt                          # Реєстрація нативного модуля при старті RN
├── ios/AudioEngine/
│   ├── AudioCaptureService.swift                     # Захоплення звуку через AVAudioEngine installTap
│   └── JsiBridge.mm                                  # Підключення C++ ядра до iOS JS Runtime
└── src/
    ├── app/
    │   ├── providers/
    │   │   ├── DatabaseProvider.tsx                  # Ініціалізація таблиць SQLite при старті
    │   │   └── AudioLifecycleProvider.tsx            # Авто-зупинка звуку при згортанні застосунку
    │   ├── navigation/
    │   │   └── RootNavigator.tsx                     # Перемикання між сторінками Тюнера, Метронома, Історії
    │   └── App.tsx                                   # Кореневий компонент застосунку
    ├── pages/
    │   ├── tuner/
    │   │   ├── ui/TunerPage.tsx                      # Композиція віджетів тюнера на одному екрані
    │   │   └── index.ts
    │   ├── metronome/
    │   │   ├── ui/MetronomePage.tsx                  # Екран метронома
    │   │   └── index.ts
    │   └── history/
    │       ├── ui/HistoryPage.tsx                    # Екран історії замірів із SQLite
    │       └── index.ts
    ├── widgets/
    │   ├── pitch-gauge/
    │   │   ├── model/useGaugeInterpolation.ts        # Пружинна фізика стрілки та визначення статусу InTune
    │   │   ├── ui/PitchGauge.tsx                     # Контейнер шкали та стрілки
    │   │   ├── ui/GaugeNeedle.tsx                    # Анімована SVG-стрілка
    │   │   ├── ui/CentScale.tsx                      # Статична розмітка шкали (-50..0..+50 центів)
    │   │   └── index.ts
    │   ├── fretboard-selector/
    │   │   ├── model/useStringMatching.ts            # Зіставлення поточної частоти з найближчою струною
    │   │   ├── ui/FretboardSelector.tsx              # Візуальний блок вибору 6 струн
    │   │   └── index.ts
    │   └── spectrum-monitor/
    │       ├── model/useWaveformFrame.ts             # Опитування масиву амплітуд із JSI
    │       ├── ui/SpectrumCanvas.tsx                 # Відмальовка хвилі та спектра через SVG Path
    │       └── index.ts
    ├── features/
    │   ├── select-tuning/
    │   │   ├── model/useTuningSelection.ts           # Логіка зміни строю (Standard, Drop D, DADGAD тощо)
    │   │   ├── ui/TuningDropdown.tsx                 # Селектор строю
    │   │   └── index.ts
    │   ├── calibrate-a4/
    │   │   ├── model/useCalibrationControl.ts        # Зміна еталонної частоти 415–466 Гц у стейті та C++
    │   │   ├── ui/CalibrationStepper.tsx             # Кнопки +/- для калібрування Гц
    │   │   └── index.ts
    │   └── toggle-string-lock/
    │       ├── model/useStringLock.ts                # Фіксація на конкретній струні або авто-режим
    │       ├── ui/StringLockSwitch.tsx               # Перемикач режиму фіксації
    │       └── index.ts
    ├── entities/
    │   ├── pitch/
    │   │   ├── model/types.ts                        # Інтерфейси PitchReading, NoteName, OctaveNumber
    │   │   ├── model/usePitchStream.ts               # Головний цикл читання даних з JSI у SharedValues
    │   │   ├── lib/noteFrequencyMath.ts              # Формули 1200 * log2(f / f_ref) та пошук MIDI-ноти
    │   │   ├── ui/NoteBadge.tsx                      # Відображення великої літери ноти та частоти в Гц
    │   │   └── index.ts
    │   ├── tuning-preset/
    │   │   ├── model/types.ts                        # Інтерфейси GuitarString, TuningPreset
    │   │   ├── model/presets.ts                      # Довідник частот для всіх підтримуваних строїв
    │   │   ├── model/tuningStore.ts                  # Стейт обраного строю та еталона A4
    │   │   └── index.ts
    │   └── tuning-session/
    │       ├── model/types.ts                        # Структура запису історії налаштування
    │       ├── api/sessionRepository.ts              # CRUD-запити до SQLite
    │       └── index.ts
    └── shared/
        ├── api/
        │   ├── jsi/
        │   │   ├── types.ts                          # Типізація глобального C++ об'єкта __StrunaEngine
        │   │   └── nativeStrunaEngine.ts             # Безпечний фасад виклику JSI методів
        │   └── database/
        │       └── sqliteClient.ts                   # Підключення до локального файлу бази даних
        ├── lib/
        │   ├── permissions/
        │   │   └── useMicrophonePermission.ts        # Запит та перевірка дозволу на запис аудіо
        │   └── audio-session/
        │       └── useAppStateAudioGuard.ts          # Слухач AppState для паузи аудіо-потоку
        ├── config/
        │   ├── constants.ts                          # Математичні та аудіо-константи проєкту
        │   └── theme.ts                              # Палітра кольорів, розміри шрифтів та відступи
        └── ui/
            ├── icons/
            │   ├── TuningForkIcon.tsx
            │   ├── LockIcon.tsx
            │   ├── UnlockIcon.tsx
            │   ├── MetronomeIcon.tsx
            │   ├── HistoryIcon.tsx
            │   └── WaveIcon.tsx
            ├── Typography.tsx
            ├── Surface.tsx
            └── IconButton.tsx

```

---

## 3. Контракти даних між шарами (Data Contracts)

Щоб розробник одразу розумів, як C++ передає дані в TypeScript, нижче зафіксовані точні інтерфейси на межі шарів.

### Контракт C++ (`cpp/dsp/AudioTypes.hpp`)

```cpp
#pragma once
#include <cstdint>

namespace struna {

struct PitchFrame {
    float frequencyHz;
    float confidence;
    float rmsDb;
    bool isLocked;
};

}

```

### Контракт JSI Мосту (`src/shared/api/jsi/types.ts`)

```typescript
export interface NativePitchFrame {
  readonly frequencyHz: number;
  readonly confidence: number;
  readonly rmsDb: number;
  readonly isLocked: boolean;
}

export interface StrunaJsiEngine {
  startAudioCapture(): boolean;
  stopAudioCapture(): void;
  pollPitchFrame(): NativePitchFrame;
  getWaveformSnapshot(targetArray: Float32Array): void;
  setNoiseGateThresholdDb(decibels: number): void;
  setMetronomeBpm(bpm: number): void;
  setMetronomeActive(active: boolean): void;
}

declare global {
  var __StrunaEngine: StrunaJsiEngine | undefined;
}

```

### Контракт Доменної Математики (`src/entities/pitch/lib/noteFrequencyMath.ts`)

```typescript
import { PitchReading, NoteName } from '../model/types';

const NOTE_NAMES: readonly NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];
const MIDI_A4_NOTE_NUMBER = 69;
const SEMITONES_PER_OCTAVE = 12;
const CENTS_PER_OCTAVE = 1200;

export const convertFrequencyToPitchReading = (
  frequencyHz: number,
  referenceA4Hz: number
): PitchReading | null => {
  if (frequencyHz <= 0 || referenceA4Hz <= 0) {
    return null;
  }

  const exactMidiNote =
    MIDI_A4_NOTE_NUMBER +
    SEMITONES_PER_OCTAVE * Math.log2(frequencyHz / referenceA4Hz);
  const nearestMidiNote = Math.round(exactMidiNote);

  const targetFrequencyHz =
    referenceA4Hz *
    Math.pow(2, (nearestMidiNote - MIDI_A4_NOTE_NUMBER) / SEMITONES_PER_OCTAVE);

  const centsDeviation =
    CENTS_PER_OCTAVE * Math.log2(frequencyHz / targetFrequencyHz);

  const noteIndex = ((nearestMidiNote % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  const octave = Math.floor(nearestMidiNote / SEMITONES_PER_OCTAVE) - 1;

  return {
    frequencyHz,
    targetFrequencyHz,
    cents: Math.round(centsDeviation * 10) / 10,
    noteName: NOTE_NAMES[noteIndex],
    octave,
    midiNote: nearestMidiNote,
  };
};

```

---

## 4. Робочий процес та запуск тестів з першого дня

Розробка ведеться за принципом **Native-First**: спочатку пишеться і тестується математика на ПК без запуску емулятора смартфона, і тільки після проходження всіх тестів підключається React Native.

### Крок 1: Локальний запуск C++ тестів (Виконується за 1 секунду)

Для перевірки алгоритму YIN не потрібен Android Studio або Xcode:

```bash
cmake -S cpp/tests -B build/tests
cmake --build build/tests
ctest --test-dir build/tests --output-on-failure

```

### Крок 2: Перевірка архітектури та типів TypeScript

```bash
npm run typecheck
npm run lint

```

### Крок 3: Тестування на реальному телефоні без гітари

Відкрити на комп'ютері локальний тестовий генератор `tools/tone-generator.html` (генерує синусоїди та гармоніки 6 струн через Web Audio API), покласти смартфон біля динаміка ПК і звірити покази стрілки.

---

## 5. Покроковий план комітів з критеріями приймання (Definition of Done)

Кожен коміт виконується строго по черзі. Наступний коміт не починається, доки не виконано критерій перевірки попереднього.

| № | Назва коміту | Що реалізується (Файли) | Як перевірити (Definition of Done) |
| --- | --- | --- | --- |
| **01** | `chore(init): bootstrap rn cli with strict ts and fsd structure` | `tsconfig.json`, `.eslintrc.js`, `babel.config.js`, порожні папки FSD, `shared/config/constants.ts` | Команда `npm run typecheck` проходить без помилок; налаштовані аліаси `@/shared`, `@/entities`, `@/features`, `@/widgets`, `@/pages`, `@/app`. |
| **02** | `feat(dsp): implement lock-free spsc ring buffer and rms gate` | `cpp/dsp/AudioTypes.hpp`, `cpp/dsp/RingBuffer.hpp`, `cpp/dsp/RmsGate.hpp` | Запис та читання 4096 флоатів у кільцевий буфер працює без `malloc`/`new`; `RmsGate` повертає `-100 dB` на масиві нулів. |
| **03** | `test(dsp): setup cmake google test runner and signal generator` | `cpp/tests/CMakeLists.txt`, `cpp/tests/SyntheticSignalGenerator.hpp`, `cpp/tests/YinDetectorTests.cpp` | Команда `ctest` компілює та запускає базовий тест генератора синусоїди 440 Гц. |
| **04** | `feat(dsp): implement autocorrelation detector to benchmark octave errors` | `cpp/dsp/AutocorrelationDetector.hpp` | Тест на чистому синусі проходить, але тест із домінантною 2-ю гармонікою фіксує очікувану помилку на октаву (доказ для README). |
| **05** | `feat(dsp): implement yin detector with parabolic interpolation` | `cpp/dsp/YinDetector.hpp`, `cpp/dsp/YinDetector.cpp` | Усі C++ юніт-тести на частотах 82.41–329.63 Гц проходять з точністю $\pm 0.5$ цента; тест із 2-ю та 3-ю гармоніками стабільно видає $f_0$. |
| **06** | `feat(dsp): add median filter and transient attack suppression` | `cpp/dsp/PitchStabilizer.hpp`, `cpp/dsp/PitchStabilizer.cpp` | Подача шуму в перші 80 мс сигналу ігнорується стабілізатором; поодинокий викид частоти (наприклад, один кадр 164 Гц серед 82 Гц) відсікається медіаною. |
| **07** | `feat(android): implement low-latency audio capture thread via audiorecord` | `AudioCaptureThread.kt`, `AudioFocusManager.kt`, `android/app/src/main/cpp/CMakeLists.txt`, `JniBridge.cpp` | Застосунок збирається на Android, запитує доступ до мікрофона і в режимі реального часу заповнює C++ `RingBuffer` з `AudioRecord`. |
| **08** | `feat(ios): implement avaudioengine tap and audio interruption handler` | `ios/AudioEngine/AudioCaptureService.swift`, `ios/AudioEngine/JsiBridge.mm` | Проєкт компілюється для iOS та передає PCM Float32 буфери у той самий C++ `RingBuffer`. |
| **09** | `feat(jsi): expose struna dsp engine to js via synchronous host object` | `cpp/jsi/StrunaHostObject.hpp`, `cpp/jsi/StrunaHostObject.cpp`, `src/shared/api/jsi/nativeStrunaEngine.ts` | Виклик `nativeStrunaEngine.pollPitchFrame()` у JS миттєво повертає об'єкт `{ frequencyHz, confidence, rmsDb }` без асинхронних промісів. |
| **10** | `feat(shared): implement microphone permissions and appstate lifecycle guard` | `useMicrophonePermission.ts`, `useAppStateAudioGuard.ts`, `AudioLifecycleProvider.tsx` | При згортанні застосунку або блокуванні екрана захоплення мікрофона миттєво зупиняється, при поверненні — відновлюється. |
| **11** | `feat(entities): implement pitch math utilities and shared value stream hook` | `entities/pitch/model/types.ts`, `noteFrequencyMath.ts`, `usePitchStream.ts`, `NoteBadge.tsx` | Подача 82.41 Гц повертає `{ noteName: 'E', octave: 2, cents: 0 }`; хук оновлює Reanimated `SharedValue` 30 разів на секунду без ре-рендеру React-дерева. |
| **12** | `feat(entities): create guitar tuning presets and calibration store` | `entities/tuning-preset/model/types.ts`, `presets.ts`, `tuningStore.ts` | Доступні пресети Standard, Drop D, Open G, DADGAD, Half-Step Down та Chromatic; зміна A4 автоматично перераховує цільові частоти струн. |
| **13** | `feat(features): implement tuning selection, a4 calibration and string lock` | Усі файли `model/` та `ui/` у слайсах `select-tuning`, `calibrate-a4`, `toggle-string-lock` | Користувач може зафіксувати одну струну для налаштування або змінити калібрування A4 у діапазоні 415–466 Гц. |
| **14** | `feat(entities): setup sqlite repository for tuning session history` | `shared/api/database/sqliteClient.ts`, `entities/tuning-session/api/sessionRepository.ts` | Налаштовані струни та кастомні пресети зберігаються у локальній таблиці SQLite і відновлюються після перезапуску. |
| **15** | `feat(shared): build design system primitives and vector svg icon pack` | `shared/config/theme.ts`, `Typography.tsx`, `Surface.tsx`, `IconButton.tsx`, `shared/ui/icons/*` | Усі базові UI-елементи та іконки відмальовуються без жодного стороннього шрифту чи емодзі. |
| **16** | `feat(widgets): implement 60fps pitch gauge widget with reanimated worklets` | `useGaugeInterpolation.ts`, `PitchGauge.tsx`, `GaugeNeedle.tsx`, `CentScale.tsx` | Стрілка плавно рухається за частотою з затримкою $< 50\text{ мс}$, не смикається на стабільному тоні і змінює колір у межах $\pm 2$ центів. |
| **17** | `feat(widgets): implement fretboard string selector and spectrum monitor` | `widgets/fretboard-selector/*`, `cpp/dsp/SpectrumAnalyzer.hpp`, `widgets/spectrum-monitor/*` | На екрані відображається активна струна та жива крива звукової хвилі/спектра. |
| **18** | `feat(pages): assemble tuner page, history page and root navigation` | `pages/tuner/ui/TunerPage.tsx`, `pages/history/ui/HistoryPage.tsx`, `RootNavigator.tsx` | Повністю робочий застосунок тюнера з перемиканням екранів та збереженням історії. |
| **19** | `feat(dsp): implement sample-accurate c++ metronome and metronome page` | `cpp/dsp/MetronomeScheduler.hpp`, `pages/metronome/ui/MetronomePage.tsx` | Метроном генерує кліки на рівні C++ аудіо-потоку з ідеальним таймінгом без дрейфу JS `setInterval`. |
| **20** | `ci(workflow): add github actions for c++ gtest suite and debug apk build` | `.github/workflows/ci.yml`, `tools/tone-generator.html`, `README.md` | На кожен `git push` автоматично проганяються C++ юніт-тести, лінтер TypeScript та збирається готовий до встановлення `app-debug.apk`. |