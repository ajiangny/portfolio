import { useState } from 'react';
import { motion, useTransform } from 'framer-motion';
import StackIcon from 'tech-stack-icons';

export default function SkillIcon({ skill, index, progress, isMain }) {
  const [hovered, setHovered] = useState(false);
  const start = 0.462 + index * 0.001;
  const end = Math.min(1.0, start + 0.02);

  const x = useTransform(progress, [start, end], ['68vw', '0vw']);
  const rotate = useTransform(progress, [start, end], [180, 0]);
  const opacity = useTransform(progress, [start, start + 0.0075], [0, 1]);
  const scale = useTransform(progress, [start, end], [0.3, 1]);

  const sizeClass = isMain 
    ? "w-[64px] h-[64px] rounded-2xl" 
    : "w-[36px] h-[36px] rounded-lg";
    
  const iconSizeClass = isMain ? "w-[36px] h-[36px]" : "w-[18px] h-[18px]";
  const textSizeClass = isMain ? "text-[20px]" : "text-[12px]";

  return (
    <motion.div
      style={{ x, rotate, opacity, scale }}
      className={`group flex items-center justify-center border border-[#f5f0e826] bg-white/5 transition-all duration-300 hover:bg-white/75 hover:border-[#f5f0e866] hover:-translate-y-1 cursor-pointer ${sizeClass}`}
      title={skill.name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {skill.custom ? (
        <div 
          className={`${iconSizeClass} flex items-center justify-center font-bold ${textSizeClass} transition-colors duration-300`}
          style={{ color: hovered ? skill.hoverColor : 'rgba(255,255,255,0.75)' }}
        >
          {skill.custom}
        </div>
      ) : (
        <div className={`${iconSizeClass} relative flex items-center justify-center transition-all duration-300`}>
          <div className="absolute inset-0 opacity-75 group-hover:opacity-0 transition-opacity duration-300 flex items-center justify-center">
            <StackIcon name={skill.icon} variant="grayscale" />
          </div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <StackIcon name={skill.icon} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
