import React from 'react';

interface StackblitzButtonProps {
  file: string;
  title?: string;
}

export default function StackblitzButton({
  file,
  title = 'Open in Stackblitz',
}: StackblitzButtonProps) {
  const baseUrl = 'https://stackblitz.com/github/sunnyghodeswar/vegaa/tree/main';
  const stackblitzUrl = `${baseUrl}?file=${encodeURIComponent(file)}`;
  
  return (
    <div style={{ margin: '1.5rem 0' }}>
      <a
        href={stackblitzUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="button button--secondary button--lg"
        style={{ display: 'inline-block' }}
      >
        {title} →
      </a>
    </div>
  );
}

