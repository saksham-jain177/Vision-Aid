import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, RefreshCw, Eye, EyeOff, MapPin, Wifi, WifiOff, BarChart } from 'lucide-react';
import Toast from '../Toast';
import './GuardianVision.css';

interface SettingsProps {
  // Basic settings
  showConfidence: boolean;
  setShowConfidence: (value: boolean) => void;
  privacyMode: boolean;
  setPrivacyMode: (value: boolean) => void;
  geolocationEnabled: boolean;
  setGeolocationEnabled: (value: boolean) => void;
  offlineMode: boolean;
  setOfflineMode: (value: boolean) => void;

  // Advanced settings
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (value: boolean) => void;
  matchThresholdSlider: number;
  setMatchThresholdSlider: (value: number) => void;
  frameSkip: number;
  setFrameSkip: (value: number) => void;
  performanceMode: boolean;
  setPerformanceMode: (value: boolean) => void;
  dataAugmentation?: boolean;
  setDataAugmentation?: (value: boolean) => void;

  // Dashboard
  onOpenDashboard: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const Settings: React.FC<SettingsProps> = ({
  showConfidence,
  setShowConfidence,
  privacyMode,
  setPrivacyMode,
  geolocationEnabled,
  setGeolocationEnabled,
  offlineMode,
  setOfflineMode,
  showAdvancedSettings,
  setShowAdvancedSettings,
  matchThresholdSlider,
  setMatchThresholdSlider,
  frameSkip,
  setFrameSkip,
  // performanceMode,
  // setPerformanceMode,
  dataAugmentation = true,
  setDataAugmentation = () => {},
  onOpenDashboard
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isToastActive, setIsToastActive] = useState<boolean>(false);
  const [lastChangedSetting, setLastChangedSetting] = useState<string | null>(null);

  // Function to add a toast notification
  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    // Prevent spam by checking if a toast is already active
    if (isToastActive) return;

    setIsToastActive(true);

    const newToast: Toast = {
      id: Date.now(),
      message,
      type
    };
    setToasts(prevToasts => [...prevToasts, newToast]);

    // Allow new toasts after 3 seconds
    setTimeout(() => {
      setIsToastActive(false);
    }, 3000);
  };

  // Function to remove a toast notification
  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  // Handle setting changes with toast notifications
  const handleSettingChange = (
    settingName: string,
    setter: (value: any) => void,
    newValue: any,
    message: string
  ) => {
    setter(newValue);
    setLastChangedSetting(settingName);

    // Determine toast type based on setting
    let toastType: 'success' | 'error' | 'info' | 'warning' = 'info';
    let customMessage = message;

    if (settingName === 'performanceMode') {
      toastType = newValue ? 'warning' : 'success';
    } else if (settingName === 'privacyMode') {
      toastType = newValue ? 'success' : 'warning';
    } else if (settingName === 'geolocationEnabled') {
      toastType = newValue ? 'success' : 'warning';
      if (newValue) {
        customMessage = 'Location tracking enabled. Location data will be recorded with matches.';
      }
    } else if (settingName === 'matchThresholdSlider') {
      toastType = newValue > 60 ? 'warning' : 'info';
    }

    addToast(customMessage, toastType);
  };

  // Effect to log setting changes
  useEffect(() => {
    if (lastChangedSetting) {
      console.log(`Setting changed: ${lastChangedSetting}`);
    }
  }, [lastChangedSetting]);

  return (
    <>
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="settings-panel">
        <h3><SettingsIcon size={20} className="settings-icon" /> Settings</h3>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={showConfidence}
              onChange={() => handleSettingChange(
                'showConfidence',
                setShowConfidence,
                !showConfidence,
                `Confidence scores ${!showConfidence ? 'enabled' : 'disabled'}`
              )}
            />
            <span className="setting-label">
              <BarChart size={18} className="setting-icon" />
              Show Confidence Scores
            </span>
          </label>
          <span className="setting-description">
            Display match confidence percentages on detected faces.
          </span>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={privacyMode}
              onChange={() => handleSettingChange(
                'privacyMode',
                setPrivacyMode,
                !privacyMode,
                `Privacy mode ${!privacyMode ? 'enabled' : 'disabled'}`
              )}
            />
            <span className="setting-label">
              {privacyMode ? <EyeOff size={18} className="setting-icon" /> : <Eye size={18} className="setting-icon" />}
              Privacy Mode
            </span>
          </label>
          <span className="setting-description">
            Blur faces that don't match your reference images.
          </span>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={geolocationEnabled}
              onChange={() => handleSettingChange(
                'geolocationEnabled',
                setGeolocationEnabled,
                !geolocationEnabled,
                `Location tracking ${!geolocationEnabled ? 'enabled' : 'disabled'}`
              )}
            />
            <span className="setting-label">
              <MapPin size={18} className="setting-icon" />
              Enable Location Tracking
            </span>
          </label>
          <span className="setting-description">
            Record location data when matches are found.
          </span>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={() => handleSettingChange(
                'offlineMode',
                setOfflineMode,
                !offlineMode,
                `Model caching ${!offlineMode ? 'enabled' : 'disabled'}`
              )}
            />
            <span className="setting-label">
              {offlineMode ? <WifiOff size={18} className="setting-icon" /> : <Wifi size={18} className="setting-icon" />}
              Model Caching
            </span>
          </label>
          <span className="setting-description">
            Cache face detection models locally for faster loading.
          </span>
        </div>

        <div className="dashboard-button-container">
          <button
            className="dashboard-open-button"
            onClick={onOpenDashboard}
          >
            <RefreshCw size={18} className="button-icon" />
            Open Dashboard
          </button>
        </div>

        <div className="advanced-settings">
          <button
            className="advanced-settings-toggle"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          >
            {showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
          </button>

          {showAdvancedSettings && (
            <div className="advanced-settings-content">
              <div className="setting-item">
                <label>
                  <span className="setting-label">Match Sensitivity: {matchThresholdSlider}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={matchThresholdSlider}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    handleSettingChange(
                      'matchThresholdSlider',
                      setMatchThresholdSlider,
                      newValue,
                      `Match sensitivity set to ${newValue}%`
                    );
                  }}
                />
                <span className="setting-description">
                  Higher values mean stricter matching (fewer false positives).
                </span>
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Frame Skip: {frameSkip}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={frameSkip}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    handleSettingChange(
                      'frameSkip',
                      setFrameSkip,
                      newValue,
                      `Frame skip set to ${newValue}`
                    );
                  }}
                />
                <span className="setting-description">
                  Process every Nth frame (higher values improve performance).
                </span>
              </div>

              {/* Performance Mode option removed - accuracy is critical for missing person detection */}

              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={dataAugmentation}
                    onChange={() => handleSettingChange(
                      'dataAugmentation',
                      setDataAugmentation,
                      !dataAugmentation,
                      `Data augmentation ${!dataAugmentation ? 'enabled' : 'disabled'}`
                    )}
                  />
                  <span className="setting-label">
                    <RefreshCw size={18} className="setting-icon" />
                    Data Augmentation
                  </span>
                </label>
                <span className="setting-description">
                  Enhance recognition by creating variations of your reference images (rotation, brightness, contrast, flips).
                  <br />
                  <small style={{ color: '#4CAF50' }}>
                    Recommended: Creates ~18 variations from each image, significantly improving recognition accuracy.
                  </small>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;
