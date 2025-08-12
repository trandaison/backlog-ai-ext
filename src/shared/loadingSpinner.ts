// Shared loading spinner SVG component
export const LOADING_SPINNER_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="30px" height="30px" viewBox="0 0 30 30" class="lds-ring">
    <circle cx="15" cy="15" fill="none" r="13" stroke="#b7b7b7" stroke-width="2" stroke-linecap="round" transform="rotate(216.567 15 15)">
      <animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 15 15;320 15 15;720 15 15" keyTimes="0;0.5;1" dur="1s" begin="0s" repeatCount="indefinite"/>
      <animate attributeName="stroke-dasharray" calcMode="linear" values="0 80; 70 80; 00 80" keyTimes="0;0.5;1" dur="1" begin="0s" repeatCount="indefinite"/>
    </circle>
  </svg>
`;

// Helper function to create loading content with spinner
export const createLoadingContent = (message: string = 'Đang tải...') => `
  <div style="
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
    padding: 20px;
  ">
    <div style="text-align: center;">
      <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
        ${LOADING_SPINNER_SVG}
        <p style="
          margin: 16px 0;
          font-size: 12px;
          color: #666;
        ">${message}</p>
      </div>
    </div>
  </div>
`;
