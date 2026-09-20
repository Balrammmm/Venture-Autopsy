'use client'

import { motion, useReducedMotion } from 'framer-motion'

export type CompanionState = 'idle' | 'listening' | 'thinking' | 'explaining' | 'excited' | 'concerned' | 'navigating' | 'pointing'

/** Milo's existing vector character, rebuilt as a poseable companion.
 * Body, ears, eyes, tail and paws have independent, semantic animation tracks.
 */
export function MiloCompanion({ state = 'idle', size = 96, still = false }: { state?: CompanionState; size?: number; still?: boolean }) {
  const preference = useReducedMotion()
  const reduce = preference || still
  const concerned = state === 'concerned'
  const speaking = state === 'explaining' || state === 'pointing'
  const thinking = state === 'thinking'
  const excited = state === 'excited'
  const walking = state === 'navigating'
  const spring = { type: 'spring' as const, stiffness: 180, damping: 16 }
  const coat = '#E5E4D4'
  const shade = '#C8D5C3'
  const ink = '#203A32'
  return <svg className={`milo-character ${reduce ? 'milo-still' : ''}`} width={size} height={size} viewBox="0 0 112 112" fill="none" aria-hidden="true">
    <ellipse cx="56" cy="102" rx="30" ry="4" fill="#000" opacity=".2" />
    <motion.path d="M77 86C99 94 100 66 89 65" stroke={shade} strokeWidth="9" strokeLinecap="round" animate={reduce ? {} : { rotate: concerned ? [-5, 0, -5] : [0, 8, 0] }} transition={{ duration: excited ? 1 : 3.2, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '78px 87px' }} />
    <motion.g animate={reduce ? {} : { y: excited ? [0, -5, 0] : [0, -1.3, 0], scaleY: [1, 1.015, 1] }} transition={{ duration: excited ? .8 : 3.5, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '56px 100px' }}>
      <path d="M34 72C34 59 78 59 79 75L82 94C83 101 74 104 66 99H45C34 104 26 99 29 91Z" fill={shade} />
      <ellipse cx="55" cy="83" rx="17" ry="18" fill={coat} />
      <motion.path d="M37 82L34 99" stroke={coat} strokeWidth="10" strokeLinecap="round" animate={reduce ? {} : { rotate: walking ? [0, 20, 0, -20, 0] : 0 }} transition={walking ? { duration: .5, repeat: Infinity } : spring} style={{ transformOrigin: '37px 82px' }} />
      <motion.path d="M74 81L77 98" stroke={coat} strokeWidth="10" strokeLinecap="round" animate={{ rotate: reduce ? 0 : speaking ? -100 : thinking ? -45 : walking ? [0, -20, 0, 20, 0] : 0 }} transition={walking && !reduce ? { duration: .5, repeat: Infinity } : spring} style={{ transformOrigin: '74px 81px' }} />
      <motion.g animate={{ rotate: reduce ? 0 : concerned ? -7 : thinking ? 7 : state === 'listening' ? -4 : 0, y: excited && !reduce ? -2 : 0 }} transition={spring} style={{ transformOrigin: '56px 61px' }}>
        <motion.path d="M27 44L25 15Q26 10 31 14L47 30Z" fill={coat} animate={{ rotate: concerned ? -15 : thinking ? 8 : -2 }} transition={spring} style={{ transformOrigin: '35px 40px' }} />
        <motion.path d="M68 30L84 14Q89 10 89 17L86 45Z" fill={coat} animate={{ rotate: concerned ? 15 : state === 'listening' ? -9 : 2 }} transition={spring} style={{ transformOrigin: '78px 40px' }} />
        <path d="M30 21L32 35L41 30Z M83 21L81 35L72 30Z" fill="#A7BBA6" />
        <path d="M56 25C77 25 91 37 90 53C90 71 76 79 56 79C35 79 21 69 22 52C22 36 36 25 56 25Z" fill={coat} />
        <path d="M31 49C31 37 80 36 81 49L80 58C77 70 36 70 32 58Z" fill={ink} />
        <g className={excited ? 'milo-happy-eyes' : 'milo-eyes'} style={{ transformOrigin: '56px 51px' }}>
          {excited ? <path d="M40 53Q44 46 48 53M64 53Q68 46 72 53" stroke="#D5F0BF" strokeWidth="3" strokeLinecap="round" /> : <>
            <motion.ellipse cx="44" cy="51" rx={concerned ? 3 : 4} ry={thinking ? 4 : 6} fill="#D5F0BF" animate={reduce ? {} : { cx: thinking ? 46 : 44 }} />
            <motion.ellipse cx="68" cy="51" rx={concerned ? 3 : 4} ry={thinking ? 4 : 6} fill="#D5F0BF" animate={reduce ? {} : { cx: thinking ? 70 : 68 }} />
            <circle cx="45" cy="49" r="1.2" fill="#fff" /><circle cx="69" cy="49" r="1.2" fill="#fff" />
          </>}
        </g>
        {concerned && <path d="M38 42L48 45M63 45L73 42" stroke={coat} strokeWidth="2.5" strokeLinecap="round" />}
        <motion.path d="M52 63Q56 66 60 63" stroke="#C2D7AE" strokeWidth="1.6" strokeLinecap="round" animate={speaking && !reduce ? { scaleY: [1, 2, 1] } : { scaleY: 1 }} transition={{ duration: .5, repeat: speaking ? Infinity : 0 }} style={{ transformOrigin: '56px 63px' }} />
        <path d="M27 62L17 60M28 66L19 69M85 62L96 60M84 66L94 69" stroke={shade} strokeWidth="1.4" strokeLinecap="round" />
      </motion.g>
      <path d="M44 79Q56 84 68 79" stroke={ink} strokeWidth="3" />
      <rect x="52" y="81" width="8" height="9" rx="3" fill={concerned ? '#E8A17E' : '#A9D8B2'} stroke={ink} strokeWidth="1.5" />
    </motion.g>
    {thinking && <g fill="#A9D8B2">{[0, 1, 2].map(i => <motion.circle key={i} cx={91 + i * 7} cy="27" r="2" animate={reduce ? {} : { opacity: [.2, 1, .2], y: [0, -2, 0] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * .17 }} />)}</g>}
  </svg>
}
