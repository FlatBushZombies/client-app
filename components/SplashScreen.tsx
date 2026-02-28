"use client"

import { useEffect, useRef } from "react"
import { Animated, Easing, Platform, Text, View } from "react-native"

interface SplashScreenProps {
  onFinish?: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // ── animated values ────────────────────────────────────────────────────────
  const ringScale1   = useRef(new Animated.Value(0.4)).current
  const ringOpacity1 = useRef(new Animated.Value(0)).current
  const ringScale2   = useRef(new Animated.Value(0.4)).current
  const ringOpacity2 = useRef(new Animated.Value(0)).current

  const logoScale   = useRef(new Animated.Value(0.6)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoPulse   = useRef(new Animated.Value(1)).current

  const dividerWidth   = useRef(new Animated.Value(0)).current
  const dividerOpacity = useRef(new Animated.Value(0)).current

  const appNameY       = useRef(new Animated.Value(18)).current
  const appNameOpacity = useRef(new Animated.Value(0)).current

  const words = ["Find", "specialists", "to", "help", "with", "your", "task."]
  const wordAnims = useRef(
    words.map(() => ({
      opacity: new Animated.Value(0),
      y:       new Animated.Value(22),
    }))
  ).current

  const taglineOpacity = useRef(new Animated.Value(0)).current
  const taglineY       = useRef(new Animated.Value(12)).current

  const exitOpacity = useRef(new Animated.Value(1)).current

  // ── animation sequence ────────────────────────────────────────────────────
  useEffect(() => {
    const ease  = Easing.out(Easing.cubic)
    const easeB = Easing.bezier(0.34, 1.56, 0.64, 1)

    const ringIn = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(scale,   { toValue: 1, duration: 900, delay, easing: ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, delay, easing: ease, useNativeDriver: true }),
      ])

    const logoIn = Animated.parallel([
      Animated.timing(logoScale,   { toValue: 1, duration: 700, delay: 300, easing: easeB, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, delay: 300, easing: ease,  useNativeDriver: true }),
    ])

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.06, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    )

    // dividerWidth animates a layout prop so useNativeDriver must be false
    const dividerIn = Animated.parallel([
      Animated.timing(dividerWidth,   { toValue: 40,  duration: 500, delay: 700, easing: ease, useNativeDriver: false }),
      Animated.timing(dividerOpacity, { toValue: 1,   duration: 300, delay: 700, easing: ease, useNativeDriver: false }),
    ])

    const appNameIn = Animated.parallel([
      Animated.timing(appNameOpacity, { toValue: 1, duration: 500, delay: 900, easing: ease,  useNativeDriver: true }),
      Animated.timing(appNameY,       { toValue: 0, duration: 500, delay: 900, easing: easeB, useNativeDriver: true }),
    ])

    const wordSeq = wordAnims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim.opacity, { toValue: 1, duration: 450, delay: 1100 + i * 110, easing: ease,  useNativeDriver: true }),
        Animated.timing(anim.y,       { toValue: 0, duration: 450, delay: 1100 + i * 110, easing: easeB, useNativeDriver: true }),
      ])
    )

    const taglineIn = Animated.parallel([
      Animated.timing(taglineOpacity, { toValue: 0.55, duration: 600, delay: 1900, easing: ease,  useNativeDriver: true }),
      Animated.timing(taglineY,       { toValue: 0,    duration: 600, delay: 1900, easing: easeB, useNativeDriver: true }),
    ])

    const exitFade = Animated.timing(exitOpacity, {
      toValue:  0,
      duration: 500,
      delay:    3400,
      easing:   Easing.in(Easing.cubic),
      useNativeDriver: true,
    })

    Animated.parallel([
      ringIn(ringScale1, ringOpacity1, 0),
      ringIn(ringScale2, ringOpacity2, 200),
      logoIn,
      dividerIn,
      appNameIn,
      ...wordSeq,
      taglineIn,
      exitFade,
    ]).start(() => onFinish?.())

    pulse.start()
    return () => pulse.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View
      style={{ opacity: exitOpacity }}
      className="absolute inset-0 bg-[#0a1a0f] overflow-hidden justify-center z-[9999]"
    >

      {/* ── ambient rings ── */}
      <Animated.View
        style={{
          opacity:   ringOpacity1,
          transform: [{ scale: ringScale1 }],
          width:     500,
          height:    500,
          top:       -180,
          right:     -160,
        }}
        className="absolute rounded-full border border-green-700/20 bg-green-700/[0.04]"
      />
      <Animated.View
        style={{
          opacity:   ringOpacity2,
          transform: [{ scale: ringScale2 }],
          width:     320,
          height:    320,
          top:       -90,
          right:     -70,
        }}
        className="absolute rounded-full border border-green-700/[0.14]"
      />

      {/* ── main content ── */}
      <View
        className="flex-1 px-9 justify-center"
        style={{ paddingTop: Platform.OS === "ios" ? 100 : 80 }}
      >

        {/* logo */}
        <Animated.View
          style={{
            opacity:   logoOpacity,
            transform: [{ scale: Animated.multiply(logoScale, logoPulse) }],
          }}
          className="self-start mb-7 items-center justify-center"
        >
          {/* glow halo */}
          <View
            className="absolute w-24 h-24 rounded-full bg-green-700/20"
            style={{
              shadowColor:   "#15803d",
              shadowOffset:  { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius:  28,
              elevation:     16,
            }}
          />
          {/* badge */}
          <View
            className="w-[72px] h-[72px] rounded-[20px] bg-green-700 items-center justify-center"
            style={{
              shadowColor:   "#15803d",
              shadowOffset:  { width: 0, height: 8 },
              shadowOpacity: 0.55,
              shadowRadius:  20,
              elevation:     14,
            }}
          >
            <Text className="text-[36px] font-black text-green-900 leading-[42px]">Q</Text>
          </View>
        </Animated.View>

        {/* divider — width is animated so kept in style prop */}
        <Animated.View
          style={{ width: dividerWidth, opacity: dividerOpacity }}
          className="h-[2.5px] rounded-sm bg-green-700 mb-[18px]"
        />

        {/* app name */}
        <Animated.Text
          style={{
            opacity:   appNameOpacity,
            transform: [{ translateY: appNameY }],
          }}
          className="text-[11px] font-bold text-green-600 tracking-[3.5px] uppercase mb-5 font-jakarta-bold"
        >
          QuickHands Now
        </Animated.Text>

        {/* headline — word by word */}
        <View className="flex-row flex-wrap mb-[18px]">
          {words.map((word, i) => (
            <Animated.Text
              key={i}
              style={{
                opacity:   wordAnims[i].opacity,
                transform: [{ translateY: wordAnims[i].y }],
              }}
              className="text-[42px] font-extrabold text-green-50 leading-[52px] tracking-tighter font-jakarta-bold"
            >
              {word}{" "}
            </Animated.Text>
          ))}
        </View>

        {/* tagline */}
        <Animated.Text
          style={{
            opacity:   taglineOpacity,
            transform: [{ translateY: taglineY }],
          }}
          className="text-[15px] text-green-200 leading-6 tracking-wide max-w-[280px] font-jakarta"
        >
          Connect with top-tier specialists to get the job done.
        </Animated.Text>
      </View>

      {/* ── bottom trust badge ── */}
      <View
        className="flex-row items-center justify-center gap-2"
        style={{ paddingBottom: Platform.OS === "ios" ? 48 : 32 }}
      >
        <View className="w-1.5 h-1.5 rounded-full bg-green-700 opacity-50" />
        <Text className="text-xs text-green-200/45 tracking-wide font-jakarta">
          Access top-tier specialists
        </Text>
      </View>

    </Animated.View>
  )
}