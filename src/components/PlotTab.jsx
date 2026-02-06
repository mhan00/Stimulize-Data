import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ErrorBar } from 'recharts';
import { performAnalysis } from '../utils/dataProcessing';

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
      const results = performAnalysis(longFormatData);
      
      if (!results.summary || results.summary.length === 0 || !results.stats) {
        setError('No valid data for plotting.');
        return;
      }

      // Use the consolidated statistics from performAnalysis
      const { stats } = results;

      const targetSE = stats.target.sd / Math.sqrt(stats.target.n);
      const controlSE = stats.control.sd / Math.sqrt(stats.control.n);

      const chartData = [
        {
          group: 'Target',
          mean: stats.target.mean,
          se: targetSE,
          n: stats.target.n
        },
        {
          group: 'Control',
          mean: stats.control.mean,
          se: controlSE,
          n: stats.control.n
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
      : [0, 1];

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
                name === 'mean' ? `Mean: ${value.toFixed(2)}` : value,
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
              <strong>{item.group}:</strong> Mean = {item.mean.toFixed(2)}, 
              SE = {item.se.toFixed(2)}, N = {item.n}
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
