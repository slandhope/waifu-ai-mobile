import { View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

export default function ClarityLogo({ missed = 0, size = 40 }) {
  const eyeRy = missed >= 2 ? 1 : 2;
  const eyeColor = missed === 0 ? "#e0d9ff" : missed === 1 ? "#ccc" : missed === 2 ? "#aaa" : "#888";
  const bgColor = missed >= 3 ? "#5a1a1a" : "#6c5ce7";
  const bgOpacity = missed === 0 ? 0.3 : missed === 1 ? 0.15 : missed === 2 ? 0.2 : 0.1;

  const mouthD =
    missed === 0 ? "M 13 21 Q 18 25 23 21" :
    missed === 1 ? "M 13 20 Q 18 20 23 20" :
    missed === 2 ? "M 13 22 Q 18 19 23 22" :
    "M 12 23 Q 18 19 24 23";

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Circle cx="18" cy="18" r="16" fill={bgColor} opacity={bgOpacity} />
        <Circle cx="18" cy="18" r="10" fill="#6c5ce7" opacity={missed === 0 ? 0.5 : 0.2} />
        <Circle cx="18" cy="18" r="5" fill={missed === 0 ? "#a89ef0" : "#555"} />
        <Ellipse cx="13" cy="14" rx="2" ry={eyeRy} fill={eyeColor} />
        <Ellipse cx="23" cy="14" rx="2" ry={eyeRy} fill={eyeColor} />
        {missed >= 3 && (
          <>
            <Path d="M 12 16 L 11 19" stroke="#6699ff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            <Path d="M 24 16 L 25 19" stroke="#6699ff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
          </>
        )}
        <Path d={mouthD} stroke={eyeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}