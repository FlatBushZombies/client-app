"use client"

import { useEffect, useRef } from "react"
import { Animated, Easing, Platform, Text, View } from "react-native"

interface SplashScreenProps {
  onFinish?: () => void
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN       = "#16a34a"
const GREEN_LIGHT = "rgba(134,239,172,0.30)"
const GREEN_RING  = "rgba(22,163,74,0.18)"
const WHITE       = "#ffffff"
const INK         = "#0f1f14"

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // ── animated values ────────────────────────────────────────────────────────
  const arcScale1   = useRef(new Animated.Value(0.6)).current
  const arcOpacity1 = useRef(new Animated.Value(0)).current
  const arcScale2   = useRef(new Animated.Value(0.6)).current
  const arcOpacity2 = useRef(new Animated.Value(0)).current
  const arcDotScale = useRef(new Animated.Value(0)).current
  const arcDotOpac  = useRef(new Animated.Value(0)).current

  const auraOpacity = useRef(new Animated.Value(0)).current

  const logoY       = useRef(new Animated.Value(18)).current
  const logoScale   = useRef(new Animated.Value(0.85)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const pulseScale  = useRef(new Animated.Value(1)).current
  const pulseOpac   = useRef(new Animated.Value(0.6)).current

  const dividerWidth   = useRef(new Animated.Value(0)).current
  const dividerOpacity = useRef(new Animated.Value(0)).current

  const appNameY       = useRef(new Animated.Value(10)).current
  const appNameOpacity = useRef(new Animated.Value(0)).current

  const words    = ["Find", "specialists", "to", "help", "with", "your", "task."]
  const wordAnims = useRef(
    words.map(() => ({
      opacity: new Animated.Value(0),
      y:       new Animated.Value(22),
    }))
  ).current

  const taglineY       = useRef(new Animated.Value(12)).current
  const taglineOpacity = useRef(new Animated.Value(0)).current

  const ctaOpacity = useRef(new Animated.Value(0)).current

  const bottomOpacity = useRef(new Animated.Value(0)).current

  const exitOpacity = useRef(new Animated.Value(1)).current

  // ── easing presets ─────────────────────────────────────────────────────────
  const ease  = Easing.out(Easing.cubic)
  const spring = Easing.bezier(0.34, 1.56, 0.64, 1)

  useEffect(() => {
    // Arc rings
    const arcs = Animated.parallel([
      Animated.parallel([
        Animated.timing(arcScale1,   { toValue: 1, duration: 1100, delay: 80,  easing: ease,  useNativeDriver: true }),
        Animated.timing(arcOpacity1, { toValue: 1, duration: 700,  delay: 80,  easing: ease,  useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(arcScale2,   { toValue: 1, duration: 1100, delay: 220, easing: ease,  useNativeDriver: true }),
        Animated.timing(arcOpacity2, { toValue: 1, duration: 700,  delay: 220, easing: ease,  useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(arcDotScale, { toValue: 1, duration: 400,  delay: 960, easing: spring, useNativeDriver: true }),
        Animated.timing(arcDotOpac,  { toValue: 1, duration: 300,  delay: 960, easing: ease,  useNativeDriver: true }),
      ]),
    ])

    // Aura glow
    const aura = Animated.timing(auraOpacity, {
      toValue: 1, duration: 1200, delay: 300, easing: ease, useNativeDriver: true,
    })

    // Logo entrance
    const logo = Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1,    duration: 600, delay: 280, easing: ease,   useNativeDriver: true }),
      Animated.timing(logoY,       { toValue: 0,    duration: 700, delay: 280, easing: spring, useNativeDriver: true }),
      Animated.timing(logoScale,   { toValue: 1,    duration: 700, delay: 280, easing: spring, useNativeDriver: true }),
    ])

    // Pulse ring — loops after logo appears
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.22, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1,    duration: 0,    useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpac, { toValue: 0,   duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulseOpac, { toValue: 0.6, duration: 0,    useNativeDriver: true }),
        ]),
      ])
    )

    // Divider (useNativeDriver: false — animating width)
    const divider = Animated.parallel([
      Animated.timing(dividerWidth,   { toValue: 40, duration: 550, delay: 750, easing: ease, useNativeDriver: false }),
      Animated.timing(dividerOpacity, { toValue: 1,  duration: 350, delay: 750, easing: ease, useNativeDriver: false }),
    ])

    // App name
    const appName = Animated.parallel([
      Animated.timing(appNameOpacity, { toValue: 1, duration: 500, delay: 960,  easing: ease,   useNativeDriver: true }),
      Animated.timing(appNameY,       { toValue: 0, duration: 500, delay: 960,  easing: spring, useNativeDriver: true }),
    ])

    // Words stagger
    const wordSeq = wordAnims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 450, delay: 1120 + i * 105, easing: ease,   useNativeDriver: true }),
        Animated.timing(a.y,       { toValue: 0, duration: 450, delay: 1120 + i * 105, easing: spring, useNativeDriver: true }),
      ])
    )

    // Tagline
    const tagline = Animated.parallel([
      Animated.timing(taglineOpacity, { toValue: 1,  duration: 550, delay: 2000, easing: ease,   useNativeDriver: true }),
      Animated.timing(taglineY,       { toValue: 0,  duration: 550, delay: 2000, easing: spring, useNativeDriver: true }),
    ])

    // CTA & bottom
    const cta    = Animated.timing(ctaOpacity,    { toValue: 1, duration: 500, delay: 2300, easing: ease, useNativeDriver: true })
    const bottom = Animated.timing(bottomOpacity, { toValue: 1, duration: 500, delay: 2500, easing: ease, useNativeDriver: true })

    // Exit
    const exit = Animated.timing(exitOpacity, {
      toValue: 0, duration: 450, delay: 3500, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    })

    Animated.parallel([
      arcs, aura, logo, divider, appName,
      ...wordSeq,
      tagline, cta, bottom, exit,
    ]).start(() => onFinish?.())

    // Start pulse after logo lands
    setTimeout(() => pulse.start(), 1000)
    return () => pulse.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View
      style={{ opacity: exitOpacity, backgroundColor: WHITE }}
      className="absolute inset-0 overflow-hidden z-[9999]"
    >

      {/* ── Decorative arcs — top-right ── */}
      <Animated.View
        style={{
          opacity:   arcOpacity1,
          transform: [{ scale: arcScale1 }],
          position:  "absolute",
          width:     260,
          height:    260,
          top:       -80,
          right:     -80,
          borderRadius: 130,
          borderWidth:  1,
          borderColor:  GREEN_RING,
        }}
      />
      <Animated.View
        style={{
          opacity:   arcOpacity2,
          transform: [{ scale: arcScale2 }],
          position:  "absolute",
          width:     160,
          height:    160,
          top:       -36,
          right:     -36,
          borderRadius: 80,
          borderWidth:  1,
          borderColor:  "rgba(22,163,74,0.09)",
        }}
      />
      {/* Accent dot on arc */}
      <Animated.View
        style={{
          position:  "absolute",
          top:        53,
          right:      121,
          width:       6,
          height:      6,
          borderRadius: 3,
          backgroundColor: GREEN,
          opacity:   arcDotOpac,
          transform: [{ scale: arcDotScale }],
        }}
      />

      {/* ── Aura glow behind logo ── */}
      <Animated.View
        style={{
          opacity:  auraOpacity,
          position: "absolute",
          top:      Platform.OS === "ios" ? 148 : 130,
          left:      20,
          width:    110,
          height:   110,
          borderRadius: 55,
          backgroundColor: GREEN_LIGHT,
        }}
      />

      {/* ── Main content ── */}
      <View
        style={{
          flex:       1,
          paddingHorizontal: 36,
          paddingTop: Platform.OS === "ios" ? 110 : 90,
          justifyContent: "flex-start",
        }}
      >

        {/* Logo badge */}
        <Animated.View
          style={{
            opacity:   logoOpacity,
            transform: [{ translateY: logoY }, { scale: logoScale }],
            alignSelf: "flex-start",
            marginBottom: 28,
          }}
        >
          {/* Pulse ring */}
          <Animated.View
            style={{
              position:    "absolute",
              top:         -10,
              left:        -10,
              right:       -10,
              bottom:      -10,
              borderRadius: 30,
              borderWidth:  1.5,
              borderColor:  GREEN_RING,
              opacity:      pulseOpac,
              transform:    [{ scale: pulseScale }],
            }}
          />

          {/* Badge */}
          <View
            style={{
              width:        68,
              height:       68,
              borderRadius: 20,
              backgroundColor: GREEN,
              alignItems:   "center",
              justifyContent: "center",
              overflow:     "hidden",
              // Drop shadow
              ...Platform.select({
                ios: {
                  shadowColor:   GREEN,
                  shadowOffset:  { width: 0, height: 10 },
                  shadowOpacity: 0.35,
                  shadowRadius:  18,
                },
                android: { elevation: 12 },
              }),
            }}
          >
            {/* Inner gloss */}
            <View
              style={{
                position:     "absolute",
                top:          0,
                left:         0,
                right:        0,
                height:       "46%",
                backgroundColor: "rgba(255,255,255,0.18)",
                borderTopLeftRadius:  20,
                borderTopRightRadius: 20,
              }}
            />
            <Text
              style={{
                fontSize:   38,
                color:      "#fff",
                lineHeight: 44,
                fontFamily: "DMSerifDisplay-Regular", // Register this in your app
                letterSpacing: -1,
              }}
            >
              Q
            </Text>
          </View>
        </Animated.View>

        {/* Divider — width animated so useNativeDriver: false */}
        <Animated.View
          style={{
            width:        dividerWidth,
            opacity:      dividerOpacity,
            height:       1,
            backgroundColor: GREEN,
            borderRadius:    1,
            marginBottom:    18,
          }}
        />

        {/* App name */}
        <Animated.Text
          style={{
            opacity:      appNameOpacity,
            transform:    [{ translateY: appNameY }],
            fontSize:     10,
            fontWeight:   "500",
            letterSpacing: 3.5,
            textTransform: "uppercase",
            color:         GREEN,
            marginBottom:  22,
            fontFamily:   "DMSans-Medium",
          }}
        >
          QuickHands Now
        </Animated.Text>

        {/* Headline — word by word, italic on key words */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 20 }}>
          {words.map((word, i) => {
            const isEm = word === "specialists" || word === "task."
            return (
              <Animated.Text
                key={i}
                style={{
                  opacity:      wordAnims[i].opacity,
                  transform:    [{ translateY: wordAnims[i].y }],
                  fontSize:     40,
                  lineHeight:   46,
                  letterSpacing: -1.5,
                  color:        isEm ? GREEN : INK,
                  fontFamily:   isEm ? "DMSerifDisplay-Italic" : "DMSerifDisplay-Regular",
                  marginRight:   5,
                }}
              >
                {word}
              </Animated.Text>
            )
          })}
        </View>

        {/* Tagline */}
        <Animated.Text
          style={{
            opacity:      taglineOpacity,
            transform:    [{ translateY: taglineY }],
            fontSize:     14,
            color:        "#6b7280",
            lineHeight:   22,
            fontWeight:   "300",
            maxWidth:     240,
            fontFamily:   "DMSans-Light",
            marginBottom: 32,
          }}
        >
          Connect with top-tier specialists to get the job done.
        </Animated.Text>

        {/* CTA row */}
        <Animated.View
          style={{
            opacity:       ctaOpacity,
            flexDirection: "row",
            alignItems:    "center",
            gap:           14,
          }}
        >
          <View
            style={{
              height:          40,
              paddingHorizontal: 22,
              backgroundColor: GREEN,
              borderRadius:    11,
              alignItems:      "center",
              justifyContent:  "center",
              ...Platform.select({
                ios: {
                  shadowColor:   GREEN,
                  shadowOffset:  { width: 0, height: 4 },
                  shadowOpacity: 0.28,
                  shadowRadius:  10,
                },
                android: { elevation: 6 },
              }),
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12.5, fontWeight: "500", letterSpacing: 0.2, fontFamily: "DMSans-Medium" }}>
              Get started
            </Text>
          </View>

          {/* Dot trail */}
          {[0.8, 0.35, 0.15].map((o, i) => (
            <View
              key={i}
              style={{
                width:         5,
                height:        5,
                borderRadius:  2.5,
                backgroundColor: GREEN,
                opacity:       o,
              }}
            />
          ))}
        </Animated.View>

      </View>

      {/* ── Bottom trust badge ── */}
      <Animated.View
        style={{
          opacity:       bottomOpacity,
          flexDirection: "row",
          alignItems:    "center",
          justifyContent: "center",
          gap:           6,
          paddingBottom: Platform.OS === "ios" ? 52 : 34,
        }}
      >
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: GREEN, opacity: 0.4 }} />
        <Text style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 0.5, fontFamily: "DMSans-Regular" }}>
          Access top-tier specialists
        </Text>
      </Animated.View>

    </Animated.View>
  )
}