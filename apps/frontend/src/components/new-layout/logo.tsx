'use client';

/** CNS brand mark — replaces Postiz “p” logo */
export const Logo = () => {
  return (
    <div
      className="relative mx-auto mt-[8px] flex h-[52px] w-[52px] min-h-[52px] min-w-[52px] items-center justify-center"
      title="CNS"
      aria-label="CNS"
    >
      <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[12px] bg-[#612BD3]" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[12px] border border-[#0f172a]/20 bg-[#38bdf8] text-[13px] font-black tracking-tight text-[#0f172a]">
        CNS
      </div>
    </div>
  );
};
