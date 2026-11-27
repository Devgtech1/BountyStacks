'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() { const { theme, setTheme } = useTheme(); const [ready,setReady]=useState(false); useEffect(()=>setReady(true),[]); if(!ready) return <button className="btn btn-secondary" aria-label="Change theme">◐</button>; return <button className="btn btn-secondary" aria-label="Toggle theme" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button>; }
