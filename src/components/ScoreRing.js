import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export default function ScoreRing({ score = 0, size = 160 }) {
  const radius = size * 0.41;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const cx = size / 2;

  const ringColor =
    score >= 80 ? "#a78bfa" :
    score >= 50 ? "#f472b6" :
    score >= 25 ? "#fb923c" : "#555";

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={cx} cy={cx} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={size * 0.07} />
        <Circle
          cx={cx} cy={cx} r={radius}
          fill="none" stroke={ringColor}
          strokeWidth={size * 0.07}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cx}`}
        />
      </Svg>
      <Text style={[styles.number, { fontSize: size * 0.25 }]}>{score}</Text>
      <Text style={[styles.label, { fontSize: size * 0.075 }]}>clarity score</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  number: { color: "#ffffff", fontWeight: "300", letterSpacing: -2 },
  label: { color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 },
});