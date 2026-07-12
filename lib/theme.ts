export type DiaryType = "creation" | "dream" | "idea" | "reality" | "record";

export type Palette = {
  bg: string;
  text: string;
  subtext: string;
  toggleBg: string;
  cardBg: string;
  cardBorder: string;
  coreGlow: string;
  lineColor: string;
  starColor: string;
  starCount: number;
  fabFrom: string;
  fabTo: string;
  navActive: string;
  navGlow: string;
  dots: Record<DiaryType, string>;
};

export const palettes: Record<string, Palette> = {
  space: {
    bg: "radial-gradient(circle at 50% 16%, #121A38 0%, #060A1A 52%, #02030A 100%)",
    text: "#E9ECFF",
    subtext: "rgba(233,236,255,0.6)",
    toggleBg: "rgba(255,255,255,0.06)",
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.09)",
    coreGlow:
      "radial-gradient(circle at 50% 47%, rgba(110,90,255,0.3), transparent 60%), radial-gradient(circle at 60% 58%, rgba(255,90,180,0.15), transparent 55%)",
    lineColor: "#AEC0FF",
    starColor: "rgba(225,230,255,1)",
    starCount: 120,
    fabFrom: "#6E8BFF",
    fabTo: "#9A6CFF",
    navActive: "#BFD3FF",
    navGlow: "#7E96FF",
    dots: { creation: "#5BC8FF", dream: "#B98BFF", idea: "#5BE7C4", reality: "#FFC15B", record: "#FF9F5B" },
  },
  violet: {
    bg: "linear-gradient(165deg,#1E0B3A 0%,#3A1566 52%,#52207F 100%)",
    text: "#F1E8FF",
    subtext: "rgba(241,232,255,0.62)",
    toggleBg: "rgba(255,255,255,0.07)",
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.1)",
    coreGlow:
      "radial-gradient(circle at 50% 47%, rgba(168,90,255,0.34), transparent 62%), radial-gradient(circle at 58% 60%, rgba(120,70,255,0.18), transparent 55%)",
    lineColor: "#D7C2FF",
    starColor: "rgba(232,218,255,0.95)",
    starCount: 110,
    fabFrom: "#B879FF",
    fabTo: "#7E3FE0",
    navActive: "#DCC7FF",
    navGlow: "#A85CFF",
    dots: { creation: "#6FA8FF", dream: "#C07BFF", idea: "#5FE0B0", reality: "#FFD15F", record: "#FFA766" },
  },
  red: {
    bg: "linear-gradient(168deg,#2A0C18 0%,#3E1322 52%,#180611 100%)",
    text: "#FBE9EC",
    subtext: "rgba(251,233,236,0.62)",
    toggleBg: "rgba(255,255,255,0.07)",
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.1)",
    coreGlow:
      "radial-gradient(circle at 50% 47%, rgba(255,80,80,0.26), transparent 60%), radial-gradient(circle at 58% 60%, rgba(255,150,60,0.14), transparent 55%)",
    lineColor: "#FFC2B8",
    starColor: "rgba(255,225,220,0.92)",
    starCount: 110,
    fabFrom: "#FF7A6B",
    fabTo: "#E0466B",
    navActive: "#FFC9B8",
    navGlow: "#FF7A6B",
    dots: { creation: "#FF9B6B", dream: "#FF6F9A", idea: "#FFB84D", reality: "#FFE07A", record: "#FFB27A" },
  },
  purpleRed: {
    bg: "linear-gradient(165deg,#2A0E33 0%,#52183F 50%,#7A1E38 100%)",
    text: "#FBE9F2",
    subtext: "rgba(251,233,242,0.62)",
    toggleBg: "rgba(255,255,255,0.08)",
    cardBg: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.12)",
    coreGlow:
      "radial-gradient(circle at 50% 47%, rgba(190,70,160,0.3), transparent 60%), radial-gradient(circle at 60% 60%, rgba(255,80,110,0.16), transparent 55%)",
    lineColor: "#F2C9E6",
    starColor: "rgba(255,225,245,0.92)",
    starCount: 110,
    fabFrom: "#C264FF",
    fabTo: "#FF5C8A",
    navActive: "#F2C9E6",
    navGlow: "#FF5C8A",
    dots: { creation: "#C77BFF", dream: "#FF6FB5", idea: "#FF8FA0", reality: "#FFC861", record: "#FFA766" },
  },
};

export const theme = palettes.space;
export const OUTER_BG = "#02030A";

export const DIARY_LABELS: Record<DiaryType, string> = {
  creation: "יצירה",
  dream: "חלום",
  idea: "רעיון",
  reality: "מציאות",
  record: "רשומה",
};
