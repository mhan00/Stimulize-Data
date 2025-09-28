import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import _ from 'lodash';
import DataTab from './components/DataTab';
import AnalysisTab from './components/AnalysisTab';
import PlotTab from './components/PlotTab';
import { processData, applyDataCleaning, performTTest } from './utils/dataProcessing';
import './App.css';

function App() {
  // State management
  const [activeTab, setActiveTab] = useState('data');
  const [rawData, setRawData] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [processedDataBeforeCleaning, setProcessedDataBeforeCleaning] = useState(null);
  const [longFormatData, setLongFormatData] = useState(null);
  const [longFormatDataBeforeCleaning, setLongFormatDataBeforeCleaning] = useState(null);
  const [confirmedVars, setConfirmedVars] = useState(false);
  const [dataReshaped, setDataReshaped] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showPlot, setShowPlot] = useState(false);
  
  // UI State
  const [selectedVars, setSelectedVars] = useState([]);
  const [format, setFormat] = useState('Wide');
  const [cleaningOptions, setCleaningOptions] = useState({
    removeIncompleteResponses: false,
    participantIqr: false,
    participantCustom: false,
    thresholdLower: 200,
    thresholdUpper: 800
  });
  const [analysisParams, setAnalysisParams] = useState({
    paradigm: 'AMP',
    type: 't-test'
  });
  const [plotParams, setPlotParams] = useState({
    title: 'Condition Comparison',
    color: '#87CEEB',
    xLabel: 'Condition',
    yLabel: 'Ratio',
    customYRange: false,
    yMin: 0,
    yMax: 1
  });
  
  const fileInputRef = useRef(null);

  // Button state helpers
  const isConfirmDisabled = !rawData || confirmedVars;
  const isProcessDisabled = !selectedData || !confirmedVars;
  const isDownloadDisabled = !processedData;

  // File upload handler
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let data = results.data;
          
          // Add ID column if it doesn't exist
          if (!data[0]?.ID) {
            data = data.map((row, index) => ({
              ID: index + 1,
              ...row
            }));
          }

          // Remove ignored variables
          const ignoreVars = ['stimuliItems', 'timeline', 'primes'];
          const cleanedData = data.map(row => {
            const newRow = { ...row };
            ignoreVars.forEach(varName => {
              delete newRow[varName];
            });
            return newRow;
          });

          setRawData(cleanedData);
          setSelectedData(null);
          setProcessedData(null);
          setConfirmedVars(false);
          setDataReshaped(false);
          setShowAnalysis(false);
          setShowPlot(false);
          resetCleaningOptions();
        } catch (error) {
          alert(`Error uploading file: ${error.message}`);
        }
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  // Variable confirmation
  const handleConfirmVars = () => {
    if (!rawData) return;

    const requiredVars = ['ID', 'Progress', 'Duration..in.seconds.', 'sptResponses', 
                         'shuffleResult', 'sptResponseDurations', 'primeResult'];
    const availableRequired = requiredVars.filter(var_ => rawData[0]?.hasOwnProperty(var_));
    const allSelected = [...availableRequired, ...selectedVars];
    
    const filteredData = rawData.map(row => {
      const newRow = {};
      allSelected.forEach(var_ => {
        if (row.hasOwnProperty(var_)) {
          newRow[var_] = row[var_];
        }
      });
      return newRow;
    });

    setSelectedData(filteredData);
    setConfirmedVars(true);
  };

  // Data processing
  const handleProcessData = async () => {
    if (!selectedData) return;

    try {
      const { processedData: processed, longFormatData: longFormat } = await processData(selectedData, format);
      
      setProcessedData(processed);
      setProcessedDataBeforeCleaning(processed);
      setLongFormatData(longFormat);
      setLongFormatDataBeforeCleaning(longFormat);
      setDataReshaped(true);
      setShowAnalysis(false);
      setShowPlot(false);
      
      alert(`Data has been successfully converted to ${format} format with ${processed.length} rows.`);
    } catch (error) {
      alert(`Error processing data: ${error.message}`);
    }
  };

  // Data cleaning
  const handleApplyCleaning = () => {
    if (!processedDataBeforeCleaning) return;

    try {
      const cleaned = applyDataCleaning(processedDataBeforeCleaning, cleaningOptions);
      setProcessedData(cleaned);
      
      // Update long format data if needed
      if (longFormatDataBeforeCleaning) {
        const cleanedIds = cleaned.map(row => row.ID);
        const cleanedLongFormat = longFormatDataBeforeCleaning.filter(row => 
          cleanedIds.includes(row.ID)
        );
        setLongFormatData(cleanedLongFormat);
      }
      
      setShowAnalysis(false);
      setShowPlot(false);
      alert(`Data cleaning completed. Rows remaining: ${cleaned.length}`);
    } catch (error) {
      alert(`Error applying cleaning: ${error.message}`);
    }
  };

  // Download handler
  const handleDownload = () => {
    if (!processedData) return;

    const csv = Papa.unparse(processedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `processed_data_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Reset app
  const handleReset = () => {
    setRawData(null);
    setSelectedData(null);
    setProcessedData(null);
    setProcessedDataBeforeCleaning(null);
    setLongFormatData(null);
    setLongFormatDataBeforeCleaning(null);
    setConfirmedVars(false);
    setDataReshaped(false);
    setShowAnalysis(false);
    setShowPlot(false);
    setSelectedVars([]);
    setFormat('Wide');
    resetCleaningOptions();
    setAnalysisParams({ paradigm: 'AMP', type: 't-test' });
    setPlotParams({
      title: 'Condition Comparison',
      color: '#87CEEB',
      xLabel: 'Condition',
      yLabel: 'Ratio',
      customYRange: false,
      yMin: 0,
      yMax: 1
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    alert('All data and settings have been reset. You can now upload a new dataset.');
  };

  const resetCleaningOptions = () => {
    setCleaningOptions({
      removeIncompleteResponses: false,
      participantIqr: false,
      participantCustom: false,
      thresholdLower: 200,
      thresholdUpper: 800
    });
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Stimulize Data Analysis</h1>
      </div>
      
      <div className="tab-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Data
          </button>
          <button 
            className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis
          </button>
          <button 
            className={`tab ${activeTab === 'plot' ? 'active' : ''}`}
            onClick={() => setActiveTab('plot')}
          >
            Plot
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'data' && (
            <DataTab
              rawData={rawData}
              selectedData={selectedData}
              processedData={processedData}
              selectedVars={selectedVars}
              setSelectedVars={setSelectedVars}
              format={format}
              setFormat={setFormat}
              cleaningOptions={cleaningOptions}
              setCleaningOptions={setCleaningOptions}
              confirmedVars={confirmedVars}
              dataReshaped={dataReshaped}
              isConfirmDisabled={isConfirmDisabled}
              isProcessDisabled={isProcessDisabled}
              isDownloadDisabled={isDownloadDisabled}
              fileInputRef={fileInputRef}
              onFileUpload={handleFileUpload}
              onConfirmVars={handleConfirmVars}
              onProcessData={handleProcessData}
              onApplyCleaning={handleApplyCleaning}
              onDownload={handleDownload}
              onReset={handleReset}
            />
          )}
          
          {activeTab === 'analysis' && (
            <AnalysisTab
              longFormatData={longFormatData}
              analysisParams={analysisParams}
              setAnalysisParams={setAnalysisParams}
              showAnalysis={showAnalysis}
              setShowAnalysis={setShowAnalysis}
            />
          )}
          
          {activeTab === 'plot' && (
            <PlotTab
              longFormatData={longFormatData}
              plotParams={plotParams}
              setPlotParams={setPlotParams}
              showPlot={showPlot}
              setShowPlot={setShowPlot}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
