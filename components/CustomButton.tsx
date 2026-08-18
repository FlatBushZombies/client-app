import { TouchableOpacity, Text } from "react-native";

import { ButtonProps } from "@/types/type";
import { SHADOW } from "@/constants/theme";

const getBgVariantStyle = (variant: ButtonProps["bgVariant"]) => {
  switch (variant) {
    case "secondary":
      // COLORS.textSecondary (#8A8578) — NativeWind arbitrary classes must
      // be static strings, so the token value is inlined here.
      return "bg-[#8A8578]";
    case "danger":
      // COLORS.badgeRed (#EF4444)
      return "bg-[#EF4444]";
    case "success":
      // COLORS.accentGreen (#22C55E)
      return "bg-[#22C55E]";
    case "outline":
      // COLORS.border (#EAE3D6) — soft warm outline instead of cool neutral
      return "bg-transparent border-[#EAE3D6] border-[1.5px]";
    default:
      // COLORS.primary (#059669)
      return "bg-[#059669]";
  }
};

const getTextVariantStyle = (variant: ButtonProps["textVariant"]) => {
  switch (variant) {
    case "primary":
      // COLORS.textPrimary (#1C1B18) — warm near-black, not pure black
      return "text-[#1C1B18]";
    case "secondary":
      return "text-gray-100";
    case "danger":
      return "text-red-100";
    case "success":
      return "text-green-100";
    default:
      return "text-white";
  }
};

// Outline buttons rely on their border for definition and get a lighter
// float; solid/filled variants get the fuller glossy "raised" underglow.
const getShadowStyle = (variant: ButtonProps["bgVariant"]) =>
  variant === "outline" ? SHADOW.card : SHADOW.raised;

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRight,
  className = "",
  style,
  ...props
}: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`w-full rounded-full px-4 py-4 flex flex-row justify-center items-center ${getBgVariantStyle(bgVariant)} ${className}`}
      style={[getShadowStyle(bgVariant), style]}
      {...props}
    >
      {IconLeft && <IconLeft />}
      <Text className={`text-lg font-bold ${getTextVariantStyle(textVariant)}`}>
        {title}
      </Text>
      {IconRight && <IconRight />}
    </TouchableOpacity>
  );
};

export default CustomButton;
