// Custom HTML root for web - wraps the Expo app in a phone frame for desktop preview
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>FreshScan - AI Fridge Scanner</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>
        <div className="phone-bg">
          <div className="phone-frame">
            <div className="phone-notch" />
            <div className="phone-screen">{children}</div>
            <div className="phone-home-indicator" />
          </div>
          <div className="phone-info">
            <div className="phone-info-title">FreshScan</div>
            <div className="phone-info-subtitle">AI Fridge Scanner + Expiry-First Recipes</div>
          </div>
        </div>
      </body>
    </html>
  );
}

const globalStyles = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
  min-height: 100vh;
  overflow-x: hidden;
}

@media (max-width: 480px) {
  /* On real mobile, render full-screen without the frame */
  .phone-bg {
    display: block !important;
    background: #fff !important;
    min-height: 100vh;
    padding: 0 !important;
  }
  .phone-frame {
    width: 100% !important;
    height: 100vh !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .phone-notch, .phone-home-indicator, .phone-info {
    display: none !important;
  }
  .phone-screen {
    border-radius: 0 !important;
  }
}

@media (min-width: 481px) {
  .phone-bg {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 32px 16px;
    gap: 20px;
  }

  .phone-frame {
    position: relative;
    width: 390px;
    height: 844px;
    background: #1a1a1a;
    border-radius: 48px;
    padding: 12px;
    box-shadow:
      0 0 0 2px #2a2a2a,
      0 25px 60px rgba(0, 0, 0, 0.4),
      0 0 80px rgba(76, 175, 80, 0.2);
  }

  .phone-notch {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 30px;
    background: #1a1a1a;
    border-radius: 0 0 16px 16px;
    z-index: 100;
  }

  .phone-home-indicator {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 134px;
    height: 5px;
    background: #fff;
    border-radius: 3px;
    z-index: 100;
    opacity: 0.8;
  }

  .phone-screen {
    width: 100%;
    height: 100%;
    background: #fff;
    border-radius: 38px;
    overflow: hidden;
    position: relative;
  }

  #root {
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  .phone-info {
    text-align: center;
    color: #fff;
  }
  .phone-info-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  .phone-info-subtitle {
    font-size: 13px;
    opacity: 0.85;
    margin-top: 4px;
  }
}
`;
