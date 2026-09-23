'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{
  label: string;
  icon: ReactNode;
  path: string;
  onClick?: () => void;
}> = ({ label, icon, path, onClick }) => {
  const currentPath = usePathname();
  const isActive = path !== '#' && currentPath.indexOf(path) === 0;

  const className = clsx(
    'group mx-auto box-border flex w-full max-w-[56px] flex-col items-center justify-center gap-[2px] rounded-[12px] px-[4px] py-[8px] text-center font-[600] transition-colors hover:bg-boxFocused hover:text-textItemFocused',
    'minCustom:h-[54px] custom:h-[44px]',
    isActive ? 'bg-boxFocused text-textItemFocused' : 'text-textItemBlur'
  );

  const inner = (
    <>
      <div className="flex w-full origin-center items-center justify-center custom:scale-90">
        {icon}
      </div>
      <div className="w-full text-center leading-[1.1] custom:text-[9px] minCustom:text-[10px]">
        {label}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={label} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      title={label}
      {...(path.indexOf('http') === 0 ? { target: '_blank' } : {})}
      className={className}
    >
      {inner}
    </Link>
  );
};
