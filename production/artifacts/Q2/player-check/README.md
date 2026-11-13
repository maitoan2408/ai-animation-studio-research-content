# Target-player diagnostic — EX-020

First seek screenshot was frame 0, not the requested frame 72: do not use its
color metric. The fixture HTTP server lacked byte-range support; `seeked` was
insufficient proof of the decoded image. Added Range/206 serving and a visible
video with requestVideoFrameCallback mediaTime assertion. Retest presents 3.0s
(frame 72) before sampling. All failed helper experiments remain in evidence.

Chromium played the 8s clip at 1x, muted. The current quality counters include
seek activity; they are not a playback-only dropped-frame budget or creative
review. Color measurement is diagnostic only; Q7 full profile QC stays open.
