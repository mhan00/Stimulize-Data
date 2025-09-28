import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ErrorBar } from 'recharts';
import { performTTest } from '../utils/dataProcessing';

const PlotTab = ({
  longFormatData,
  plotParams,
  setPlotParams,
  showPlot,
  setShowPlot
}) => {
  const [plotData, setPlotData] = useState(null);
  const [error, setError] = useState(null);

  const handleParamChange = (param, value) => {
    setPlotParams({
      ...plotParams,
      [param]: value
    });
  };

  const handleGeneratePlot = () => {
    if (!longFormatData || longFormatData.length === 0) {
      setError('No data available for plotting. Please process data in the Data tab first.');
      return;
    }

    try {
      const results = performTTest(longFormatData);
      
      if (!results.summary || results.summary.length === 0) {
        setError('No valid data for plotting.');
        return;
      }

      // Calculate plot data
      const targetRatios = results.summary.map(row => row.target_ratio).filter(r => !isNaN(r));
      const controlRatios = results.summary.map(row => row.control_ratio).filter(r => !isNaN(r));

      if (targetRatios.length === 0 || controlRatios.length === 0) {
        setError('Insufficient data for plotting.');
        return;
      }

      const targetMean = targetRatios.reduce((sum, val) => sum + val, 0) / targetRatios.length;
      const controlMean = controlRatios.reduce((sum, val) => sum + val, 0) / controlRatios.length;

      const targetSD = Math.sqrt(
        targetRatios.reduce((sum, val) => sum + Math.pow(val - targetMean, 2), 0) / (targetRatios.length - 1)
      );
      const controlSD = Math.sqrt(
        controlRatios.reduce((sum, val) => sum + Math.pow(val - controlMean, 2), 0) / (controlRatios.length - 1)
      );

      const targetSE = targetSD / Math.sqrt(targetRatios.length);
      const controlSE = controlSD / Math.sqrt(controlRatios.length);

      const chartData = [
        {
          group: 'Target',
          mean: targetMean,
          se: targetSE,
          n: targetRatios.length
        },
        {
          group: 'Control',
          mean: controlMean,
          se: controlSE,
          n: controlRatios.length
        }
      ];

      setPlotData(chartData);
      setShowPlot(true);
      setError(null);
    } catch (err) {
      setError(`Error in plotting: ${err.message}`);
      setPlotData(null);
    }
  };

  const renderPlot = () => {
    if (!showPlot) {
      return (
        <div className="plot-placeholder">
          <p>Click 'Generate Plot' to create the visualization.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="plot-error">
          <p className="error">{error}</p>
        </div>
      );
    }

    if (!plotData) {
      return (
        <div className="plot-placeholder">
          <p>No plot data available.</p>
        </div>
      );
    }

    const yAxisDomain = plotParams.customYRange 
      ? [plotParams.yMin, plotParams.yMax] 
      : ['dataMin - 0.1', 'dataMax + 0.1'];

    return (
      <div className="plot-container">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={plotData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="group" 
              tick={{ fontSize: 12 }}
              label={{ value: plotParams.xLabel, position: 'insideBottom', offset: -5, style: { fontSize: '14px' } }}
            />
            <YAxis 
              domain={yAxisDomain}
              tick={{ fontSize: 12 }}
              label={{ value: plotParams.yLabel, angle: -90, position: 'insideLeft', style: { fontSize: '14px' } }}
            />
            <Tooltip 
              formatter={(value, name) => [
                name === 'mean' ? `Mean: ${value.toFixed(4)}` : value,
                name
              ]}
              labelFormatter={(label) => `Condition: ${label}`}
            />
            <Bar 
              dataKey="mean" 
              fill={plotParams.color}
              fillOpacity={0.7}
              stroke={plotParams.color}
              strokeWidth={1}
            >
              <ErrorBar dataKey="se" width={4} stroke="#666" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div className="plot-title">
          <h3 style={{ textAlign: 'center', fontSize: '16px', margin: '10px 0' }}>
            {plotParams.title}
          </h3>
        </div>
        
        <div className="plot-info">
          <p><strong>Note:</strong> Error bars represent standard error (SE).</p>
          {plotData.map((item, index) => (
            <p key={index}>
              <strong>{item.group}:</strong> Mean = {item.mean.toFixed(4)}, 
              SE = {item.se.toFixed(4)}, N = {item.n}
            </p>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="plot-tab">
      <div className="sidebar">
        <h4>Plot Settings</h4>
        
        <div className="section">
          <label>
            Plot Title:
            <input
              type="text"
              value={plotParams.title}
              onChange={(e) => handleParamChange('title', e.target.value)}
            />
          </label>
        </div>

        <div className="section">
          <label>
            Color (e.g., #87CEEB):
            <input
              type="text"
              value={plotParams.color}
              onChange={(e) => handleParamChange('color', e.target.value)}
              placeholder="#87CEEB"
            />
          </label>
        </div>

        <div className="section">
          <label>
            X-Axis Label:
            <input
              type="text"
              value={plotParams.xLabel}
              onChange={(e) => handleParamChange('xLabel', e.target.value)}
            />
          </label>
        </div>

        <div className="section">
          <label>
            Y-Axis Label:
            <input
              type="text"
              value={plotParams.yLabel}
              onChange={(e) => handleParamChange('yLabel', e.target.value)}
            />
          </label>
        </div>

        <div className="section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={plotParams.customYRange}
              onChange={(e) => handleParamChange('customYRange', e.target.checked)}
            />
            Custom Y-Axis Range
          </label>
          
          {plotParams.customYRange && (
            <div className="range-inputs">
              <label>
                Minimum value:
                <input
                  type="number"
                  step="0.1"
                  value={plotParams.yMin}
                  onChange={(e) => handleParamChange('yMin', parseFloat(e.target.value) || 0)}
                />
              </label>
              <label>
                Maximum value:
                <input
                  type="number"
                  step="0.1"
                  value={plotParams.yMax}
                  onChange={(e) => handleParamChange('yMax', parseFloat(e.target.value) || 1)}
                />
              </label>
            </div>
          )}
        </div>

        <div className="section">
          <button 
            className="btn btn-primary"
            onClick={handleGeneratePlot}
          >
            Generate Plot
          </button>
        </div>
      </div>

      <div className="main-panel">
        <h4>Data Visualization</h4>
        {renderPlot()}
      </div>
    </div>
  );
};

export default PlotTab;
