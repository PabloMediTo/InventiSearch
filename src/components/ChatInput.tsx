import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

const SpeechRecognition =
  (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition })
    .SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
    .webkitSpeechRecognition;

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef("");
  const preVoiceTextRef = useRef("");
  const isListeningRef = useRef(false);

  // Audio visualizer refs
  const barsContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const barsDataRef = useRef<number[]>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [text]);

  const drawBars = useCallback(() => {
    const container = barsContainerRef.current;
    const analyser = analyserRef.current;
    if (!container || !analyser) return;

    const dataArray = new Uint8Array(analyser.fftSize);
    const maxBars = Math.floor(container.clientWidth / 5); // bar width 3px + gap 2px

    function draw() {
      if (!isListeningRef.current) return;
      animFrameRef.current = requestAnimationFrame(draw);

      analyser!.getByteTimeDomainData(dataArray);

      // Calculate current volume (RMS)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const volume = Math.min(1, rms * 8); // amplify and cap at 1

      // Push new bar value, keep scrolling left to right
      barsDataRef.current.push(volume);
      if (barsDataRef.current.length > maxBars) {
        barsDataRef.current.shift();
      }

      // Update bar heights
      const bars = container!.querySelectorAll<HTMLDivElement>(".voice-bar");
      const data = barsDataRef.current;
      bars.forEach((bar, i) => {
        const dataIndex = data.length - bars.length + i;
        if (dataIndex >= 0 && dataIndex < data.length) {
          const h = Math.max(4, data[dataIndex] * 34);
          bar.style.height = `${h}px`;
        } else {
          bar.style.height = "4px";
        }
      });
    }

    draw();
  }, []);

  async function startVoice() {
    if (!SpeechRecognition || isListening) return;

    // Start audio stream for visualization
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }
    streamRef.current = stream;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    // Start speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      if (finalTranscript) {
        baseTextRef.current = baseTextRef.current + finalTranscript;
        setText(baseTextRef.current);
      } else {
        setText(baseTextRef.current + interimTranscript);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          stopAudio();
          setIsListening(false);
          isListeningRef.current = false;
        }
      }
    };

    recognition.onerror = (e: Event) => {
      if ((e as SpeechRecognitionErrorEvent).error !== "no-speech") {
        stopAudio();
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    preVoiceTextRef.current = text;
    baseTextRef.current = text;
    recognitionRef.current = recognition;
    isListeningRef.current = true;
    recognition.start();
    setIsListening(true);
  }

  // Start drawing once bars container is mounted
  useEffect(() => {
    if (isListening && barsContainerRef.current && analyserRef.current) {
      barsDataRef.current = [];
      drawBars();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isListening, drawBars]);

  function stopAudio() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
  }

  function confirmVoice() {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopAudio();
    setIsListening(false);
  }

  function cancelVoice() {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopAudio();
    setIsListening(false);
    setText(preVoiceTextRef.current);
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const hasVoiceSupport = !!SpeechRecognition;

  return (
    <div className="chat-input-container" role="form" aria-label="Message input">
      {isListening ? (
        <div className="voice-recording-bar">
          <div ref={barsContainerRef} className="voice-bars-container">
            {Array.from({ length: 150 }).map((_, i) => (
              <div key={i} className="voice-bar" />
            ))}
          </div>
          <div className="voice-recording-actions">
            <button
              onClick={cancelVoice}
              className="voice-cancel-btn"
              aria-label="Cancel recording"
              type="button"
            >
              <Icon icon="mdi:close" width="20" height="20" />
            </button>
            <button
              onClick={confirmVoice}
              className="voice-confirm-btn"
              aria-label="Confirm recording"
              type="button"
            >
              <Icon icon="mdi:check" width="20" height="20" />
            </button>
          </div>
        </div>
      ) : (
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products..."
            disabled={disabled}
            rows={1}
            aria-label="Type your message"
            aria-describedby="input-hint"
          />
          <span id="input-hint" className="sr-only">
            Press Enter to send, Shift+Enter for new line
          </span>
          {hasVoiceSupport && (
            <button
              onClick={startVoice}
              disabled={disabled}
              className="voice-button"
              aria-label="Start voice input"
              type="button"
            >
              <Icon icon="mdi:microphone-outline" width="32" height="32" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={disabled || !text.trim()}
            className="send-button"
            aria-label="Send message"
            type="button"
          >
            <Icon icon="mdi:send" width="20" height="20" />
          </button>
        </div>
      )}
    </div>
  );
}
