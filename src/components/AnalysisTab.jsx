import React, { useState, useEffect } from 'react';
import { performTTest } from '../utils/dataProcessing';

const AnalysisTab = ({
  longFormatData,
  analysisParams,
  setAnalysisParams,
  showAnalysis,
  setShowAnalysis
}) => {
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);

  const handleParamChange = (param, value) => {
    setAnalysisParams({
      ...analysisParams,
      [param]: value
    });
  };

  const handleGenerateAnalysis = () => {
    if (!longFormatData || longFormatData.length === 0) {
      setError('No data available for analysis. Please process data in the Data tab first.');
      return;
    }

    try {
      const results = performTTest(longFormatData);
      setAnalysisResults(results);
      setShowAnalysis(true);
      setError(null);
    } catch (err) {
      setError(`Error in analysis: ${err.message}`);
      setAnalysisResults(null);
    }
  };

  const formatSummaryTable = (summary) => {
    if (!summary || summary.length === 0) return null;

    const stats = {
      count: summary.length,
      targetRatioMean: summary.reduce((sum, row) => sum + (row.target_ratio || 0), 0) / summary.length,
      targetRatioSD: 0,
      controlRatioMean: summary.reduce((sum, row) => sum + (row.control_ratio || 0), 0) / summary.length,
      controlRatioSD: 0
    };

    // Calculate standard deviations
    const targetRatios = summary.map(row => row.target_ratio || 0);
    const controlRatios = summary.map(row => row.control_ratio || 0);
    
    stats.targetRatioSD = Math.sqrt(
      targetRatios.reduce((sum, val) => sum + Math.pow(val - stats.targetRatioMean, 2), 0) / (targetRatios.length - 1)
    );
    
    stats.controlRatioSD = Math.sqrt(
      controlRatios.reduce((sum, val) => sum + Math.pow(val - stats.controlRatioMean, 2), 0) / (controlRatios.length - 1)
    );

    return stats;
  };

  const renderSummary = () => {
    if (!showAnalysis) {
      return <p>Click 'Generate Analysis' to view the summary.</p>;
    }

    if (error) {
      return <p className="error">{error}</p>;
    }

    if (!analysisResults) {
      return <p>No analysis results available.</p>;
    }

    const stats = formatSummaryTable(analysisResults.summary);
    
    if (!stats) {
      return <p>Unable to generate summary statistics.</p>;
    }

    return (
      <div className="summary-stats">
        <h5>Summary Statistics</h5>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Number of Participants</td>
              <td>{stats.count}</td>
            </tr>
            <tr>
              <td>Target Ratio Mean</td>
              <td>{stats.targetRatioMean.toFixed(4)}</td>
            </tr>
            <tr>
              <td>Target Ratio SD</td>
              <td>{isNaN(stats.targetRatioSD) ? 'N/A' : stats.targetRatioSD.toFixed(4)}</td>
            </tr>
            <tr>
              <td>Control Ratio Mean</td>
              <td>{stats.controlRatioMean.toFixed(4)}</td>
            </tr>
            <tr>
              <td>Control Ratio SD</td>
              <td>{isNaN(stats.controlRatioSD) ? 'N/A' : stats.controlRatioSD.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
        
        <h5>Individual Participant Data</h5>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>k_0</th>
                <th>d_0</th>
                <th>k_1</th>
                <th>d_1</th>
                <th>Target Ratio</th>
                <th>Control Ratio</th>
              </tr>
            </thead>
            <tbody>
              {analysisResults.summary.slice(0, 20).map((row, index) => (
                <tr key={index}>
                  <td>{row.ID}</td>
                  <td>{row.k_0}</td>
                  <td>{row.d_0}</td>
                  <td>{row.k_1}</td>
                  <td>{row.d_1}</td>
                  <td>{row.target_ratio ? row.target_ratio.toFixed(4) : 'N/A'}</td>
                  <td>{row.control_ratio ? row.control_ratio.toFixed(4) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {analysisResults.summary.length > 20 && (
            <p>Showing first 20 rows of {analysisResults.summary.length} total participants</p>
          )}
        </div>
      </div>
    );
  };

  const renderAnalysis = () => {
    if (!showAnalysis) {
      return <p>Click 'Generate Analysis' to view the statistical analysis.</p>;
    }

    if (error) {
      return <p className="error">{error}</p>;
    }

    if (!analysisResults || !analysisResults.tTestResult) {
      return <p>No statistical analysis results available.</p>;
    }

    const { tTestResult } = analysisResults;

    return (
      <div className="analysis-results">
        <h5>Two-Sample t-Test Results</h5>
        <div className="test-results">
          <table className="stats-table">
            <tbody>
              <tr>
                <td><strong>Target Condition Mean:</strong></td>
                <td>{tTestResult.mean1.toFixed(6)}</td>
              </tr>
              <tr>
                <td><strong>Control Condition Mean:</strong></td>
                <td>{tTestResult.mean2.toFixed(6)}</td>
              </tr>
              <tr>
                <td><strong>Mean Difference:</strong></td>
                <td>{(tTestResult.mean1 - tTestResult.mean2).toFixed(6)}</td>
              </tr>
              <tr>
                <td><strong>t-statistic:</strong></td>
                <td>{tTestResult.tStatistic.toFixed(6)}</td>
              </tr>
              <tr>
                <td><strong>Degrees of Freedom:</strong></td>
                <td>{tTestResult.degreesOfFreedom}</td>
              </tr>
              <tr>
                <td><strong>p-value (two-tailed):</strong></td>
                <td>{tTestResult.pValue.toFixed(6)}</td>
              </tr>
            </tbody>
          </table>
          
          <div className="interpretation">
            <h6>Interpretation:</h6>
            <p>
              {tTestResult.pValue < 0.05 
                ? `The difference between conditions is statistically significant (p < 0.05).`
                : `The difference between conditions is not statistically significant (p ≥ 0.05).`
              }
            </p>
            <p>
              <strong>Note:</strong> This analysis uses a simplified t-test implementation. 
              For publication-quality results, please verify using dedicated statistical software.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-tab">
      <div className="sidebar">
        <div className="section">
          <label>
            Paradigm:
            <select 
              value={analysisParams.paradigm}
              onChange={(e) => handleParamChange('paradigm', e.target.value)}
            >
              <option value="AMP">AMP</option>
              <option value="Go/No-Go">Go/No-Go</option>
            </select>
          </label>
        </div>

        <div className="section">
          <label>
            Statistical Method:
            <select 
              value={analysisParams.type}
              onChange={(e) => handleParamChange('type', e.target.value)}
            >
              <option value="t-test">t-test</option>
            </select>
          </label>
        </div>

        <div className="section">
          <button 
            className="btn btn-primary"
            onClick={handleGenerateAnalysis}
          >
            Generate Results
          </button>
        </div>
      </div>

      <div className="main-panel">
        <div className="analysis-content">
          <div className="summary-section">
            <h4>Summary</h4>
            {renderSummary()}
          </div>

          <div className="analysis-section">
            <h4>Statistical Analysis</h4>
            {renderAnalysis()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisTab;
