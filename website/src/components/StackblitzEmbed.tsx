import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

interface StackblitzEmbedProps {
  file: string;
  height?: string;
}

export default function StackblitzEmbed({
  file,
  height = '600px',
}: StackblitzEmbedProps) {
  return (
    <BrowserOnly>
      {() => {
        const baseUrl = 'https://stackblitz.com/github/sunnyghodeswar/vegaa/tree/main';
        const embedUrl = `${baseUrl}?embed=1&file=${encodeURIComponent(file)}`;
        
        return (
          <div style={{ margin: '2rem 0', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe
              src={embedUrl}
              style={{
                width: '100%',
                height,
                border: 'none',
                borderRadius: '8px',
              }}
              title="Stackblitz Embed"
              allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            />
          </div>
        );
      }}
    </BrowserOnly>
  );
}

