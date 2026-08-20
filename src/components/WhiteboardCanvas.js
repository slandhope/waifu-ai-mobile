import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg'
import { StyleSheet, View } from 'react-native'

const W = 320
const H = 184

function scaleX(x) { return (x / 800) * W }
function scaleY(y) { return (y / 460) * H }

export default function WhiteboardCanvas({ cmds = [] }) {
  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Rect x={0} y={0} width={W} height={H} fill="#fafafa" rx={12} />
        {(cmds || []).map((c, i) => {
          const color = c.color || '#1a1a2e'
          if (c.t === 'title' || c.t === 'text') {
            const fs = c.t === 'title' ? 14 : Math.min(c.size ? c.size / 2.2 : 11, 12)
            const fw = c.t === 'title' ? '800' : '600'
            const x = scaleX(c.x || 0)
            const y = scaleY(c.y || 0)
            return (
              <SvgText key={i} x={x} y={y} fill={color} fontSize={fs} fontWeight={fw}>
                {String(c.v || '').slice(0, 48)}
              </SvgText>
            )
          }
          if (c.t === 'line' || c.t === 'arrow') {
            return (
              <Line
                key={i}
                x1={scaleX(c.x1)} y1={scaleY(c.y1)}
                x2={scaleX(c.x2)} y2={scaleY(c.y2)}
                stroke={color}
                strokeWidth={2}
              />
            )
          }
          if (c.t === 'circle') {
            return (
              <Circle
                key={i}
                cx={scaleX(c.x)} cy={scaleY(c.y)} r={scaleX(c.r || 20)}
                stroke={color} strokeWidth={2} fill="none"
              />
            )
          }
          if (c.t === 'box') {
            return (
              <Rect
                key={i}
                x={scaleX(c.x)} y={scaleY(c.y)}
                width={scaleX(c.w || 80)} height={scaleY(c.h || 40)}
                stroke={color} strokeWidth={2} fill="none" rx={4}
              />
            )
          }
          return null
        })}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    marginVertical: 8,
  },
})
