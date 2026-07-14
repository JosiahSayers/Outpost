import { Avatar, type AvatarProps } from "@mantine/core";

type Props = { size?: number; winking?: boolean } & Omit<
  AvatarProps,
  "size" | "children"
>;

export default function MarmotAvatar({
  size = 40,
  winking = false,
  ...props
}: Props) {
  const iconSize = Math.round(size * 0.95);

  return (
    <Avatar
      radius="xl"
      size={size}
      color="trail-green"
      variant="filled"
      {...props}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <g className={winking ? "marmot-face--pop" : undefined}>
          <path
            d="M20 44 Q20 22 32 22 Q44 22 44 44 Q44 50 32 50 Q20 50 20 44 Z"
            fill="#f4f2ef"
          />
          <path d="M22 26 Q18 14 25 15 Q26 22 26 24 Z" fill="#f4f2ef" />
          <path d="M42 26 Q46 14 39 15 Q38 22 38 24 Z" fill="#f4f2ef" />
          <circle cx="27" cy="36" r="2.4" fill="#2c2720" />
          <circle
            cx="37"
            cy="36"
            r="2.4"
            fill="#2c2720"
            className={`marmot-eye${winking ? " marmot-eye--wink" : ""}`}
          />
          <path
            d="M29 43 Q32 46 35 43"
            stroke="#2c2720"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="24.5" cy="41" r="2.6" fill="#dfa647" opacity="0.55" />
          <circle cx="39.5" cy="41" r="2.6" fill="#dfa647" opacity="0.55" />
        </g>
      </svg>
    </Avatar>
  );
}
