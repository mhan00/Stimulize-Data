import React, { useState } from 'react';

const DataTab = ({
  rawData,
  selectedData,
  processedData,
  selectedVars,
  setSelectedVars,
  format,
  setFormat,
  cleaningOptions,
  setCleaningOptions,
  confirmedVars,
  dataReshaped,
  isConfirmDisabled,
  isProcessDisabled,
  isDownloadDisabled,
  fileInputRef,
  onFileUpload,
  onConfirmVars,
  onProcessData,
  onApplyCleaning,
  onDownload,
  onReset
}) => {
  const [showCleaning, setShowCleaning] = useState(false);

  // Get variable lists
  const getVariableLists = () => {
    if (!rawData || rawData.length === 0) return { required: [], optional: [] };
    
    const requiredVars = ['ID', 'Progress', 'Duration..in.seconds.', 'sptResponses', 
                         'shuffleResult', 'sptResponseDurations', 'primeResult'];
    const allVars = Object.keys(rawData[0] || {});
    const availableRequired = requiredVars.filter(var_ => allVars.includes(var_));
    const optional = allVars.filter(var_ => !requiredVars.includes(var_));
    
    return { required: availableRequired, optional };
  };

  const { required: requiredVars, optional: optionalVars } = getVariableLists();

  const handleVarChange = (varName, checked) => {
    if (checked) {
      setSelectedVars([...selectedVars, varName]);
    } else {
      setSelectedVars(selectedVars.filter(v => v !== varName));
    }
  };

  const handleSelectAll = () => {
    setSelectedVars([...optionalVars]);
  };

  const handleSelectNone = () => {
    setSelectedVars([]);
  };

  const handleCleaningOptionChange = (option, value) => {
    setCleaningOptions({
      ...cleaningOptions,
      [option]: value
    });
  };

  // Data preview
  const getDataPreview = () => {
    const data = processedData || selectedData || rawData;
    if (!data || data.length === 0) return null;
    
    const headers = Object.keys(data[0]);
    const rows = data.slice(0, 10); // Show first 10 rows
    
    return { headers, rows, totalRows: data.length };
  };

  const dataPreview = getDataPreview();

  return (
    <div className="data-tab">
      <div className="sidebar">
        {/* File Upload Section */}
        <div className="section">
          <div className="file-input-container">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={onFileUpload}
              className="file-input"
            />
            <button 
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              {rawData ? 'Choose Different File' : 'Upload CSV File'}
            </button>
          </div>
          {rawData && (
            <div className="file-status">
              ✅ File loaded successfully with {rawData.length} rows
            </div>
          )}
        </div>

        {/* Variable Selection */}
        {rawData && !confirmedVars && (
          <div className="section">
            {optionalVars.length > 0 && (
              <div className="var-controls">
                <button className="btn btn-sm" onClick={handleSelectAll}>
                  Select All
                </button>
                <button className="btn btn-sm" onClick={handleSelectNone}>
                  Clear All
                </button>
              </div>
            )}
            
            {requiredVars.length > 0 && (
              <div className="var-group">
                <strong>Required Variables (cannot uncheck):</strong>
                {requiredVars.map(var_ => (
                  <label key={var_} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled={true}
                    />
                    {var_}
                  </label>
                ))}
              </div>
            )}
            
            {optionalVars.length > 0 && (
              <div className="var-group">
                <strong>Optional Variables:</strong>
                {optionalVars.map(var_ => (
                  <label key={var_} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedVars.includes(var_)}
                      onChange={(e) => handleVarChange(var_, e.target.checked)}
                    />
                    {var_}
                  </label>
                ))}
              </div>
            )}
            
            <button 
              className={`btn ${isConfirmDisabled ? 'btn-disabled' : 'btn-primary'}`}
              disabled={isConfirmDisabled}
              onClick={onConfirmVars}
            >
              Confirm
            </button>
          </div>
        )}

        {/* Format Selection */}
        {confirmedVars && (
          <div className="section">
            <label>Choose a format to convert your data:</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="Wide"
                  checked={format === 'Wide'}
                  onChange={(e) => setFormat(e.target.value)}
                />
                Wide format
              </label>
              <label>
                <input
                  type="radio"
                  value="Long"
                  checked={format === 'Long'}
                  onChange={(e) => setFormat(e.target.value)}
                />
                Long format
              </label>
            </div>
            <p className="help-text">Note: This step is required for further analyses.</p>
            <button 
              className={`btn ${isProcessDisabled ? 'btn-disabled' : 'btn-primary'}`}
              disabled={isProcessDisabled}
              onClick={onProcessData}
            >
              Convert
            </button>
          </div>
        )}

        {/* Data Cleaning Section */}
        {dataReshaped && (
          <div className="section">
            <h4>Optional: Data Cleaning</h4>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowCleaning(!showCleaning)}
            >
              Data Cleaning Method
            </button>
            
            {showCleaning && (
              <div className="cleaning-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cleaningOptions.removeIncompleteResponses}
                    onChange={(e) => handleCleaningOptionChange('removeIncompleteResponses', e.target.checked)}
                  />
                  Remove Incomplete Responses
                </label>
                <p className="help-text">Removes rows where Status is not 0 and Progress is not 100%</p>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cleaningOptions.participantIqr}
                    onChange={(e) => handleCleaningOptionChange('participantIqr', e.target.checked)}
                  />
                  Remove Participants by IQR Method
                </label>
                <p className="help-text">Removes outliers based on the Interquartile Range method applied to Duration</p>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cleaningOptions.participantCustom}
                    onChange={(e) => handleCleaningOptionChange('participantCustom', e.target.checked)}
                  />
                  Remove Participants by Custom Value
                </label>
                <p className="help-text">Removes participants based on custom Duration thresholds</p>
                
                {cleaningOptions.participantCustom && (
                  <div className="threshold-inputs">
                    <label>
                      Define Duration Threshold (lower bound):
                      <input
                        type="number"
                        value={cleaningOptions.thresholdLower}
                        onChange={(e) => handleCleaningOptionChange('thresholdLower', parseFloat(e.target.value) || 0)}
                      />
                    </label>
                    <label>
                      Define Duration Threshold (upper bound):
                      <input
                        type="number"
                        value={cleaningOptions.thresholdUpper}
                        onChange={(e) => handleCleaningOptionChange('thresholdUpper', parseFloat(e.target.value) || 0)}
                      />
                    </label>
                  </div>
                )}
                
                <button className="btn btn-primary" onClick={onApplyCleaning}>
                  Apply
                </button>
              </div>
            )}
          </div>
        )}

        {/* Download and Reset */}
        <div className="section">
          <button 
            className={`btn ${isDownloadDisabled ? 'btn-disabled' : 'btn-primary'}`}
            disabled={isDownloadDisabled}
            onClick={onDownload}
          >
            Download
          </button>
          <button className="btn btn-secondary" onClick={onReset}>
            Reset App
          </button>
        </div>
      </div>

      {/* Main Panel - Data Preview */}
      <div className="main-panel">
        <h4>Data Preview</h4>
        {dataPreview ? (
          <div className="data-preview">
            <div className="data-info">
              <p>Showing first 10 rows of {dataPreview.totalRows} total rows</p>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {dataPreview.headers.map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataPreview.rows.map((row, index) => (
                    <tr key={index}>
                      {dataPreview.headers.map(header => (
                        <td key={header}>{row[header] || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p>No data to preview. Please upload a CSV file.</p>
        )}
      </div>
    </div>
  );
};

export default DataTab;
