/**
 * Shared Tailwind class strings.
 * Kept here so repeated pieces (buttons, cards, pills, fields) stay consistent.
 */

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

/* --------------------------------- buttons --------------------------------- */
const btnBase =
  "font-extrabold whitespace-nowrap transition-all duration-150 enabled:hover:-translate-y-px";

const btnVariants = {
  primary:
    "bg-[linear-gradient(135deg,#589edb,#76b6e9)] text-white shadow-[0_5px_12px_#5596cc2b]",
  light: "border border-[#deedf9] bg-[#f2f8fe] text-[#3c78aa]",
  danger: "border border-[#deedf9] bg-[#f2f8fe] text-[#b5524f]",
};

const btnSizes = {
  md: "rounded-xl px-[15px] py-2.5 text-xs",
  sm: "rounded-xl px-3 py-[9px] text-xs",
  lg: "rounded-[14px] px-[22px] py-3.5 text-sm",
};

export const btn = (
  variant: keyof typeof btnVariants = "primary",
  size: keyof typeof btnSizes = "md",
) => cx(btnBase, btnVariants[variant], btnSizes[size]);

export const linkBtn = "bg-transparent text-[11px] font-extrabold text-[#5089b7]";
export const spinner =
  "inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]";

/* ---------------------------------- cards ---------------------------------- */
export const card =
  "overflow-hidden rounded-[19px] border border-[#e1edf7] bg-white shadow-card";
export const cardHead =
  "flex items-start justify-between gap-3 px-[22px] pt-5 pb-[15px] max-[860px]:px-[15px]";
export const cardTitle =
  "m-0 font-display text-[17px] font-extrabold tracking-[-0.4px] text-[#204a74]";
export const cardFoot =
  "flex items-center justify-between border-t border-[#eef4f9] px-[22px] py-[13px] text-[11px] text-muted max-[860px]:px-[15px]";
export const sub = "mt-1 text-[11px] leading-[1.45] text-muted";
export const empty = "px-5 py-8 text-center text-[13px] leading-normal text-muted";
export const emptySmall =
  "px-5 pt-3 pb-[22px] text-center text-xs leading-normal text-muted";
export const courtCard =
  "rounded-[19px] border border-[#e1edf7] bg-white p-4 shadow-card";
export const courtCardEmpty =
  "rounded-[19px] border border-dashed border-[#cbe2f6] bg-[#fafdff] p-4";
export const lockedHead = "bg-[#f4f7fa]";
export const skeleton =
  "skeleton animate-[shimmer_1.4s_ease-in-out_infinite] rounded-lg " +
  "bg-[linear-gradient(90deg,var(--color-skeleton)_0%,var(--color-skeleton-hi)_50%,var(--color-skeleton)_100%)] " +
  "bg-[length:200%_100%]";
export const skelBar = (w = "w-24", h = "h-3.5") => cx(skeleton, w, h);
export const skelCircle = (size = "size-8") =>
  cx(skeleton, "rounded-full", size);

/* --------------------------------- headings -------------------------------- */
export const eyebrow =
  "text-[10px] font-extrabold tracking-[1.8px] text-[#5794c9] uppercase";
export const h1 =
  "mt-2 font-display text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.6px] text-[#183e6b]";

/* --------------------------------- avatars --------------------------------- */
const avatarBase =
  "grid flex-none place-items-center rounded-xl border text-[11px] font-extrabold text-[#4b8fc8]";
export const avatar = cx(
  avatarBase,
  "size-[33px] border-[#e3f0fb] bg-[linear-gradient(145deg,#e3f2ff,#f0f8ff)]",
);
export const avatarOnCourt = cx(avatarBase, "size-[30px] border-transparent bg-white");

/* ---------------------------------- pills ---------------------------------- */
const pillBase =
  "inline-block w-fit rounded-[20px] font-bold not-italic whitespace-nowrap";
const pillVariants = {
  default: "bg-[#eaf5ff] px-[9px] py-1 text-[10px] text-[#4a87b5]",
  warn: "bg-warn-bg px-[9px] py-1 text-[10px] text-warn",
  ok: "bg-ok-bg px-[9px] py-1 text-[10px] text-ok",
  next: "bg-[#5da5e4] px-[7px] py-0.5 text-[9px] tracking-[0.3px] text-white",
  danger: "bg-[#fde7e5] px-[9px] py-1 text-[10px] text-[#b5524f]",
};
export const pill = (variant: keyof typeof pillVariants = "default") =>
  cx(pillBase, pillVariants[variant]);

export const chip =
  "inline-block rounded-lg border border-[#e3f0fb] bg-[#f4faff] px-2 py-1 text-xs font-bold text-[#315d84]";

/* --------------------------------- forms ----------------------------------- */
export const field = "mb-3 block flex-1";
export const fieldLabel = "mb-1.5 block text-[11px] font-extrabold text-[#5d7f9d]";
export const fieldInput =
  "w-full rounded-xl border border-[#dcebf8] bg-[#fbfdff] px-3 py-[11px] text-[13px] outline-none focus:border-[#8cc3ef] focus:shadow-[0_0_0_3px_#5da5e41f]";
export const fieldTextarea = cx(fieldInput, "h-[180px] resize-y leading-[1.55]");
export const fieldRow = "flex gap-2.5 max-[860px]:flex-col max-[860px]:gap-0";
export const selectInput =
  "max-w-[260px] rounded-xl border border-[#d9eafa] bg-white px-3 py-2.5 text-xs font-bold text-[#3c78aa]";
export const notice = "min-h-4 text-[11px] text-muted";
export const errorNotice = "min-h-4 text-[11px] font-bold text-[#b5524f]";
export const modalActions = "mt-3.5 flex justify-end gap-2";
export const toastBox =
  "pointer-events-none fixed bottom-[22px] left-1/2 z-30 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-xl bg-[#285c8d] px-4 py-[11px] text-xs text-white shadow-[0_8px_22px_#23598b35] transition-all duration-200";
