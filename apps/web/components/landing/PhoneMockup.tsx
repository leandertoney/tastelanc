interface PhoneMockupProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tilt?: 'left' | 'right' | 'none';
}

const SIZES = {
  sm: { width: 220, height: 448 },
  md: { width: 280, height: 572 },
  lg: { width: 320, height: 652 },
};

export default function PhoneMockup({ children, size = 'md', className = '', tilt = 'none' }: PhoneMockupProps) {
  const { width, height } = SIZES[size];

  const tiltStyle = tilt === 'left'
    ? { transform: 'perspective(1200px) rotateY(12deg) rotateX(2deg)', transformStyle: 'preserve-3d' as const }
    : tilt === 'right'
    ? { transform: 'perspective(1200px) rotateY(-12deg) rotateX(2deg)', transformStyle: 'preserve-3d' as const }
    : {};

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width, height, ...tiltStyle }}
    >
      {/* Drop shadow underneath phone */}
      <div
        className="absolute inset-x-4 -bottom-4 h-16 rounded-[50%] blur-2xl opacity-30 -z-10"
        style={{ background: 'rgba(0,0,0,0.8)' }}
      />

      {/* Outer phone body — titanium bezel */}
      <div
        className="absolute inset-0 rounded-[3rem] overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #3a3a3c 0%, #2c2c2e 30%, #1c1c1e 70%, #0a0a0a 100%)',
          boxShadow: `
            0 25px 60px rgba(0,0,0,0.5),
            0 10px 20px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.3)
          `,
        }}
      >
        {/* Inner bezel edge highlight */}
        <div
          className="absolute inset-[1px] rounded-[2.95rem]"
          style={{
            background: 'linear-gradient(145deg, #48484a 0%, #2c2c2e 20%, #1c1c1e 80%, #0a0a0a 100%)',
          }}
        >
          {/* Screen bezel — creates the "frame" around screen */}
          <div className="absolute inset-[2px] rounded-[2.85rem] bg-black">
            {/* Dynamic Island */}
            <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[80px] h-[24px] bg-black rounded-full z-20">
              {/* Camera lens */}
              <div className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[8px] h-[8px] rounded-full bg-[#1a1a2e] border border-[#2a2a3e]">
                <div className="absolute inset-[2px] rounded-full bg-[#0d0d1a]" />
              </div>
            </div>

            {/* Screen content area */}
            <div className="absolute inset-[3px] overflow-hidden rounded-[2.7rem]">
              {children}
            </div>

            {/* Screen glass reflection overlay */}
            <div
              className="absolute inset-[3px] rounded-[2.7rem] pointer-events-none z-10"
              style={{
                background: 'linear-gradient(165deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.01) 100%)',
              }}
            />

            {/* Home indicator */}
            <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[96px] h-[4px] bg-white/25 rounded-full z-20" />
          </div>
        </div>
      </div>

      {/* Side buttons */}
      {/* Power button (right) */}
      <div
        className="absolute -right-[1.5px] top-[28%] w-[3px] h-[50px] rounded-r-sm"
        style={{ background: 'linear-gradient(180deg, #48484a, #2c2c2e, #1c1c1e)' }}
      />
      {/* Silent switch (left) */}
      <div
        className="absolute -left-[1.5px] top-[18%] w-[3px] h-[22px] rounded-l-sm"
        style={{ background: 'linear-gradient(180deg, #48484a, #2c2c2e)' }}
      />
      {/* Volume up (left) */}
      <div
        className="absolute -left-[1.5px] top-[27%] w-[3px] h-[35px] rounded-l-sm"
        style={{ background: 'linear-gradient(180deg, #48484a, #2c2c2e, #1c1c1e)' }}
      />
      {/* Volume down (left) */}
      <div
        className="absolute -left-[1.5px] top-[35%] w-[3px] h-[35px] rounded-l-sm"
        style={{ background: 'linear-gradient(180deg, #48484a, #2c2c2e, #1c1c1e)' }}
      />
    </div>
  );
}
