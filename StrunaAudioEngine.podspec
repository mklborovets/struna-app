require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "StrunaAudioEngine"
  s.version      = package["version"]
  s.summary      = "Real-time C++17 YIN DSP engine and AVAudioEngine JSI bridge for STRUNA"
  s.homepage     = "https://github.com/mklborovets/struna"
  s.license      = "MIT"
  s.authors      = { "mklborovets" => "borovecmikola@gmail.com" }
  s.platforms    = { :ios => "13.4" }
  s.source       = { :git => "https://github.com/mklborovets/struna.git", :tag => "#{s.version}" }

  s.source_files = [
    "cpp/dsp/**/*.{hpp,cpp}",
    "cpp/jsi/**/*.{hpp,cpp}",
    "ios/AudioEngine/**/*.{swift,h,m,mm}"
  ]

  s.public_header_files = []
  s.private_header_files = "cpp/**/*.{hpp,h}"

  s.swift_version = "5.0"
  s.libraries = "c++"
  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/cpp/dsp\" \"$(PODS_TARGET_SRCROOT)/cpp/jsi\"",
    "DEFINES_MODULE" => "YES"
  }

  s.dependency "React-Core"
  s.dependency "React-jsi"
end
