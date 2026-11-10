import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';

// ─── XSS文字列テスト ──────────────────────────────────────────────────────────
const XSS_STRINGS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  '"><svg onload=alert(1)>',
  'javascript:alert(1)',
  '<iframe src="javascript:alert(1)">',
];

// ─── React が XSS 文字列をエスケープするか検証 ────────────────────────────────
describe('XSS: React JSX text rendering escapes dangerous strings', () => {
  XSS_STRINGS.forEach(xss => {
    it(`safely renders: ${xss.slice(0, 40)}`, () => {
      const { container } = render(
        React.createElement('div', { 'data-testid': 'output' }, xss)
      );
      // テキストとして表示される（HTML として解釈されない）
      const el = screen.getByTestId('output');
      expect(el.textContent).toBe(xss);
      // innerHTML には生の危険なタグは含まれない
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).not.toContain('<img src=x');
      expect(container.innerHTML).not.toContain('<svg onload');
      expect(container.innerHTML).not.toContain('<iframe src=');
    });
  });
});

// ─── dangerouslySetInnerHTML 不使用の検証 ──────────────────────────────────────
describe('XSS: no dangerouslySetInnerHTML in today components', () => {
  const todayDir = path.resolve(__dirname, '../components/today');
  const todayPage = path.resolve(__dirname, '../pages/TodayPage.tsx');

  const filesToCheck = [
    ...fs.readdirSync(todayDir)
      .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
      .map(f => path.join(todayDir, f)),
    todayPage,
  ];

  filesToCheck.forEach(filePath => {
    it(`${path.basename(filePath)} does not use dangerouslySetInnerHTML`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toContain('dangerouslySetInnerHTML');
    });
  });
});

// ─── LocalStorage only (no fetch/XMLHttpRequest calls) ───────────────────────
describe('security: no external API calls in today components', () => {
  const todayDir = path.resolve(__dirname, '../components/today');
  const todayPage = path.resolve(__dirname, '../pages/TodayPage.tsx');

  const filesToCheck = [
    ...fs.readdirSync(todayDir)
      .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
      .map(f => path.join(todayDir, f)),
    todayPage,
  ];

  filesToCheck.forEach(filePath => {
    it(`${path.basename(filePath)} does not call fetch or XMLHttpRequest`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toMatch(/\bfetch\s*\(/);
      expect(content).not.toContain('XMLHttpRequest');
      expect(content).not.toContain('axios');
    });
  });
});
