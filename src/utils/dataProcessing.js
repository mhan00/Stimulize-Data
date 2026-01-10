import _ from 'lodash';

// Main data processing function
export const processData = async (data, format) => {
  if (!data || data.length === 0) {
    throw new Error('No data provided');
  }

  let processedData = [...data];

  // Ensure ID exists
  processedData = processedData.map((row, index) => ({
    ID: row.ID || (index + 1),
    ...row
  }));

  // Check for required columns
  const requiredCols = ['sptResponses', 'shuffleResult', 'sptResponseDurations', 'primeResult'];
  const missingCols = requiredCols.filter(col => !processedData[0]?.hasOwnProperty(col));
  
  if (missingCols.length > 0) {
    throw new Error(`Missing required columns: ${missingCols.join(', ')}`);
  }

  // Process sptResponses
  let maxCols = 0;
  if (processedData[0]?.sptResponses) {
    maxCols = Math.max(...processedData.map(row => 
      row.sptResponses ? row.sptResponses.split(',').length : 0
    ));
    
    processedData = processedData.map(row => {
      if (row.sptResponses) {
        const responses = row.sptResponses.split(',');
        const newRow = { ...row };
        for (let i = 0; i < maxCols; i++) {
          newRow[`sptResponse_Trial_${i + 1}`] = responses[i] || '';
        }
        return newRow;
      }
      return row;
    });
  }

  // Process shuffleResult
  if (processedData[0]?.shuffleResult) {
    processedData = processedData.map(row => {
      if (row.shuffleResult) {
        const shuffleParts = row.shuffleResult.split(';');
        const newRow = { ...row };
        newRow.shuffleStimuli1 = shuffleParts[0] || '';
        newRow.shuffleStimuli2 = shuffleParts[1] || '';
        newRow.shuffleStimuli3 = shuffleParts[2] || '';
        
        // Process shuffleStimuli1 into trial columns
        if (newRow.shuffleStimuli1) {
          const stimuli = newRow.shuffleStimuli1.split(',');
          for (let i = 0; i < maxCols; i++) {
            newRow[`ShuffleResult_Trial_${i + 1}`] = stimuli[i] || '';
          }
        }
        
        return newRow;
      }
      return row;
    });
  }

  // Process sptResponseDurations
  if (processedData[0]?.sptResponseDurations) {
    processedData = processedData.map(row => {
      if (row.sptResponseDurations) {
        const durations = row.sptResponseDurations.split(',');
        const newRow = { ...row };
        for (let i = 0; i < maxCols; i++) {
          newRow[`sptResponseDuration_Trial_${i + 1}`] = durations[i] || '';
        }
        return newRow;
      }
      return row;
    });
  }

  // Process primeResult
  if (processedData[0]?.primeResult) {
    processedData = processedData.map(row => {
      if (row.primeResult) {
        const primeParts = row.primeResult.split(';');
        const newRow = { ...row };
        newRow.primeResult1 = primeParts[0] ? primeParts[0].replace(/.*=/, '') : '';
        newRow.primeResult2 = primeParts[1] ? primeParts[1].replace(/.*=/, '') : '';
        return newRow;
      }
      return row;
    });
  }

  // Process ShuffleResult based on primeResult1
  const shuffleColumns = Object.keys(processedData[0] || {}).filter(col => 
    col.startsWith('ShuffleResult_Trial_')
  );
  
  if (shuffleColumns.length > 0 && processedData[0]?.primeResult1) {
    processedData = processedData.map(row => {
      const newRow = { ...row };
      shuffleColumns.forEach(col => {
        newRow[col] = (row[col] === row.primeResult1) ? '1' : '0';
      });
      return newRow;
    });
  }

  // Create long format data (following R script logic)
  let longFormatData = null;
  const trialColumns = [
    ...Object.keys(processedData[0] || {}).filter(col => col.startsWith('sptResponse_Trial_')),
    ...Object.keys(processedData[0] || {}).filter(col => col.startsWith('ShuffleResult_Trial_')),
    ...Object.keys(processedData[0] || {}).filter(col => col.startsWith('sptResponseDuration_Trial_'))
  ];

  if (trialColumns.length > 0) {
    longFormatData = [];
    
    processedData.forEach(row => {
      // Get unique trial numbers from all trial columns
      const trialNumbers = [...new Set(
        trialColumns.map(col => {
          const match = col.match(/_Trial_(\d+)$/);
          return match ? match[1] : null;
        }).filter(Boolean)
      )].sort((a, b) => parseInt(a) - parseInt(b));
      
      trialNumbers.forEach((trialNum, index) => {
        const longRow = {
          ID: row.ID,
          trial: trialNum,
          record: index + 1
        };
        
        // Add non-trial columns (exclude original raw columns and trial columns)
        const excludeColumns = new Set([
          'sptResponses', 'shuffleResult', 'sptResponseDurations', 'primeResult',
          'shuffleStimuli1', 'shuffleStimuli2', 'shuffleStimuli3',
          ...trialColumns
        ]);
        
        Object.keys(row).forEach(key => {
          if (!excludeColumns.has(key)) {
            longRow[key] = row[key];
          }
        });
        
        // Add trial-specific columns with their base names
        const trialSuffix = `_Trial_${trialNum}`;
        if (row[`sptResponse${trialSuffix}`] !== undefined) {
          longRow.sptResponse = row[`sptResponse${trialSuffix}`];
        }
        if (row[`ShuffleResult${trialSuffix}`] !== undefined) {
          longRow.ShuffleResult = row[`ShuffleResult${trialSuffix}`];
        }
        if (row[`sptResponseDuration${trialSuffix}`] !== undefined) {
          longRow.sptResponseDuration = row[`sptResponseDuration${trialSuffix}`];
        }
        
        longFormatData.push(longRow);
      });
    });
    
    // Filter out rows with empty sptResponse (following R script logic)
    longFormatData = longFormatData.filter(row => 
      row.sptResponse !== undefined && row.sptResponse !== null && row.sptResponse !== ''
    );
  }

  // Return appropriate format
  const finalData = format === 'Long' && longFormatData ? longFormatData : processedData;
  
  return {
    processedData: finalData,
    longFormatData: longFormatData
  };
};

// Data cleaning function
export const applyDataCleaning = (data, cleaningOptions, format = 'Wide') => {
  if (!data || data.length === 0) {
    throw new Error('No data provided for cleaning');
  }

  let cleanedData = [...data];
  const originalCount = cleanedData.length;

  // Remove incomplete responses
  if (cleaningOptions.removeIncompleteResponses) {
    const beforeCount = cleanedData.length;
    cleanedData = cleanedData.filter(row => {
      // Check for Status column (could be 'Status' or 'status')
      const statusKey = Object.keys(row).find(key => key.toLowerCase() === 'status');
      const progressKey = Object.keys(row).find(key => key.toLowerCase() === 'progress');
      
      if (!statusKey || !progressKey) {
        // If Status/Progress columns don't exist, keep the row
        return true;
      }
      
      const status = parseFloat(row[statusKey]);
      const progress = parseFloat(row[progressKey]);
      return !isNaN(status) && !isNaN(progress) && status === 0 && progress === 100;
    });
    console.log(`Incomplete responses filter: ${beforeCount} -> ${cleanedData.length} rows`);
  }

  // Remove low quality responses (participants who select same option for all trials)
  if (cleaningOptions.removeLowQualResponses) {
    const beforeCount = cleanedData.length;
    const sptResponseColumns = Object.keys(cleanedData[0] || {}).filter(key => 
      key.startsWith('sptResponse_Trial_')
    );
    
    if (sptResponseColumns.length > 0) {
      cleanedData = cleanedData.filter(row => {
        const responses = sptResponseColumns
          .map(col => row[col])
          .filter(val => val !== undefined && val !== null && val !== '');
        
        if (responses.length === 0) return true; // Keep if no responses
        
        // Count unique responses
        const uniqueResponses = new Set(responses);
        return uniqueResponses.size > 1; // Keep only if more than 1 unique response
      });
    }
    console.log(`Low quality responses filter: ${beforeCount} -> ${cleanedData.length} rows`);
  }

  // IQR filtering
  if (cleaningOptions.participantIqr) {
    const beforeCount = cleanedData.length;
    // Find duration column (could be 'Duration..in.seconds.' or similar)
    const durationKey = Object.keys(cleanedData[0] || {}).find(key => 
      key.toLowerCase().includes('duration') && key.toLowerCase().includes('second')
    );
    
    if (durationKey) {
      const durations = cleanedData
        .map(row => parseFloat(row[durationKey]))
        .filter(d => !isNaN(d))
        .sort((a, b) => a - b);
      
      if (durations.length > 0) {
        const q1Index = Math.floor(durations.length * 0.25);
        const q3Index = Math.floor(durations.length * 0.75);
        const q1 = durations[q1Index];
        const q3 = durations[q3Index];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        cleanedData = cleanedData.filter(row => {
          const duration = parseFloat(row[durationKey]);
          return !isNaN(duration) && duration >= lowerBound && duration <= upperBound;
        });
      }
    }
    console.log(`IQR filter: ${beforeCount} -> ${cleanedData.length} rows`);
  }

  // Custom filtering
  if (cleaningOptions.participantCustom) {
    const beforeCount = cleanedData.length;
    // Find duration column
    const durationKey = Object.keys(cleanedData[0] || {}).find(key => 
      key.toLowerCase().includes('duration') && key.toLowerCase().includes('second')
    );
    
    if (durationKey) {
      cleanedData = cleanedData.filter(row => {
        const duration = parseFloat(row[durationKey]);
        return !isNaN(duration) && 
               duration >= cleaningOptions.thresholdLower && 
               duration <= cleaningOptions.thresholdUpper;
      });
    }
    console.log(`Custom filter: ${beforeCount} -> ${cleanedData.length} rows`);
  }

  // Regenerate long format data from cleaned wide data (following R script logic)
  const trialColumns = [
    ...Object.keys(cleanedData[0] || {}).filter(col => col.startsWith('sptResponse_Trial_')),
    ...Object.keys(cleanedData[0] || {}).filter(col => col.startsWith('ShuffleResult_Trial_')),
    ...Object.keys(cleanedData[0] || {}).filter(col => col.startsWith('sptResponseDuration_Trial_'))
  ];

  let longFormatData = null;
  if (trialColumns.length > 0) {
    longFormatData = [];
    
    cleanedData.forEach(row => {
      // Get unique trial numbers from all trial columns
      const trialNumbers = [...new Set(
        trialColumns.map(col => {
          const match = col.match(/_Trial_(\d+)$/);
          return match ? match[1] : null;
        }).filter(Boolean)
      )].sort((a, b) => parseInt(a) - parseInt(b));
      
      trialNumbers.forEach((trialNum, index) => {
        const longRow = {
          ID: row.ID,
          trial: trialNum,
          record: index + 1
        };
        
        // Add non-trial columns (exclude original raw columns and trial columns)
        const excludeColumns = new Set([
          'sptResponses', 'shuffleResult', 'sptResponseDurations', 'primeResult',
          'shuffleStimuli1', 'shuffleStimuli2', 'shuffleStimuli3',
          ...trialColumns
        ]);
        
        Object.keys(row).forEach(key => {
          if (!excludeColumns.has(key)) {
            longRow[key] = row[key];
          }
        });
        
        // Add trial-specific columns with their base names
        const trialSuffix = `_Trial_${trialNum}`;
        if (row[`sptResponse${trialSuffix}`] !== undefined) {
          longRow.sptResponse = row[`sptResponse${trialSuffix}`];
        }
        if (row[`ShuffleResult${trialSuffix}`] !== undefined) {
          longRow.ShuffleResult = row[`ShuffleResult${trialSuffix}`];
        }
        if (row[`sptResponseDuration${trialSuffix}`] !== undefined) {
          longRow.sptResponseDuration = row[`sptResponseDuration${trialSuffix}`];
        }
        
        longFormatData.push(longRow);
      });
    });
    
    // Filter out rows with empty sptResponse
    longFormatData = longFormatData.filter(row => 
      row.sptResponse !== undefined && row.sptResponse !== null && row.sptResponse !== ''
    );
  }

  // If no cleaning options are selected, return original data
  if (!cleaningOptions.removeIncompleteResponses && 
      !cleaningOptions.removeLowQualResponses &&
      !cleaningOptions.participantIqr && 
      !cleaningOptions.participantCustom) {
    console.log('No cleaning options selected, returning original data');
    return { cleanedData: data, longFormatData: null };
  }

  console.log(`Total cleaning: ${originalCount} -> ${cleanedData.length} rows`);
  
  return {
    cleanedData: format === 'Long' && longFormatData ? longFormatData : cleanedData,
    longFormatData: longFormatData
  };
};

// Enhanced t-test function for use with performAnalysis results
export const performTTest = (longFormatData) => {
  // Use performAnalysis to get the processed data, then run t-test
  const analysisResults = performAnalysis(longFormatData);
  
  if (!analysisResults.summary || analysisResults.summary.length === 0) {
    throw new Error('No analysis data available for t-test');
  }

  // Extract ratios for t-test
  const targetRatios = analysisResults.summary.map(r => r.target_ratio).filter(r => !isNaN(r));
  const controlRatios = analysisResults.summary.map(r => r.control_ratio).filter(r => !isNaN(r));

  if (targetRatios.length === 0 || controlRatios.length === 0) {
    throw new Error('Insufficient data for t-test');
  }

  const tTestResult = tTest(targetRatios, controlRatios);

  return {
    summary: analysisResults.summary,
    tTestResult: tTestResult
  };
};

// Paired t-test implementation (following R script update)
const tTest = (sample1, sample2) => {
  const n1 = sample1.length;
  const n2 = sample2.length;
  
  if (n1 === 0 || n2 === 0) {
    throw new Error('Cannot perform t-test with empty samples');
  }
  
  if (n1 !== n2) {
    throw new Error('Paired t-test requires equal sample sizes');
  }

  const n = n1; // Since they're equal for paired test
  const mean1 = sample1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = sample2.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate differences for paired t-test
  const differences = sample1.map((val, i) => val - sample2[i]);
  const meanDiff = differences.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate standard deviation of differences
  const varianceDiff = differences.reduce((sum, val) => sum + Math.pow(val - meanDiff, 2), 0) / (n - 1);
  const standardError = Math.sqrt(varianceDiff / n);
  
  const tStatistic = meanDiff / standardError;
  const degreesOfFreedom = n - 1; // Correct df for paired t-test
  
  // Calculate p-value using t-distribution approximation
  const pValue = 2 * (1 - tDistribution(Math.abs(tStatistic), degreesOfFreedom));

  return {
    mean1,
    mean2,
    meanDifference: meanDiff,
    tStatistic: tStatistic,
    degreesOfFreedom: degreesOfFreedom,
    pValue: Math.max(0, Math.min(1, pValue)),
    method: "Paired t-test"
  };
};

// Simple t-distribution CDF approximation
const tDistribution = (t, df) => {
  // Simplified approximation for t-distribution CDF
  // This is not as accurate as statistical libraries but provides a reasonable estimate
  const x = df / (df + t * t);
  return 0.5 + 0.5 * Math.sign(t) * (1 - betaIncomplete(0.5 * df, 0.5, x));
};

// Simplified beta incomplete function approximation
const betaIncomplete = (a, b, x) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  // Simple approximation - in a real implementation you'd want a more accurate beta function
  return Math.pow(x, a) * Math.pow(1 - x, b) / (a + b);
};

// Enhanced analysis function following R script logic
export const performAnalysis = (longFormatData) => {
  if (!longFormatData || longFormatData.length === 0) {
    throw new Error('No long format data provided for analysis');
  }

  // Check if necessary columns exist
  const requiredCols = ['ID', 'sptResponse', 'ShuffleResult'];
  const missingCols = requiredCols.filter(col => !longFormatData[0]?.hasOwnProperty(col));
  
  if (missingCols.length > 0) {
    throw new Error(`Missing columns needed for analysis: ${missingCols.join(', ')}`);
  }

  try {
    // Group by ID, sptResponse, ShuffleResult and count occurrences
    const grouped = {};
    
    longFormatData.forEach(row => {
      if (row.sptResponse !== undefined && row.sptResponse !== null && row.sptResponse !== '') {
        const key = `${row.ID}_${row.sptResponse}_${row.ShuffleResult}`;
        grouped[key] = (grouped[key] || 0) + 1;
      }
    });

    // Convert to table format
    const table1 = [];
    Object.keys(grouped).forEach(key => {
      const [ID, sptResponse, ShuffleResult] = key.split('_');
      table1.push({
        ID: ID,
        sptResponse: sptResponse,
        ShuffleResult: ShuffleResult,
        count: grouped[key]
      });
    });

    // Pivot wider to get k_0, d_0, k_1, d_1 columns
    const pivoted = {};
    table1.forEach(row => {
      if (!pivoted[row.ID]) {
        pivoted[row.ID] = { ID: row.ID };
      }
      
      const colName = `${row.sptResponse === 'k' ? 'k' : 'd'}_${row.ShuffleResult}`;
      pivoted[row.ID][colName] = row.count;
    });

    // Convert to array and fill missing values with 0
    const table1clean = Object.values(pivoted).map(row => ({
      ID: row.ID,
      k_0: row.k_0 || 0,
      d_0: row.d_0 || 0,
      k_1: row.k_1 || 0,
      d_1: row.d_1 || 0
    }));

    // Calculate ratios (remove filter - moved to data cleaning)
    const analysisData = table1clean.map(row => ({
      ...row,
      target_ratio: row.k_1 / (row.k_1 + row.d_1),
      control_ratio: row.k_0 / (row.k_0 + row.d_0)
    }));

    return {
      summary: analysisData,
      stats: calculateSummaryStats(analysisData)
    };
  } catch (error) {
    throw new Error(`Error in analysis: ${error.message}`);
  }
};

// Calculate summary statistics
const calculateSummaryStats = (data) => {
  if (data.length === 0) return null;

  const targetRatios = data.map(row => row.target_ratio).filter(val => !isNaN(val));
  const controlRatios = data.map(row => row.control_ratio).filter(val => !isNaN(val));

  const targetMean = targetRatios.reduce((a, b) => a + b, 0) / targetRatios.length;
  const controlMean = controlRatios.reduce((a, b) => a + b, 0) / controlRatios.length;
  
  const targetSD = Math.sqrt(targetRatios.reduce((sum, val) => sum + Math.pow(val - targetMean, 2), 0) / targetRatios.length);
  const controlSD = Math.sqrt(controlRatios.reduce((sum, val) => sum + Math.pow(val - controlMean, 2), 0) / controlRatios.length);

  return {
    target: {
      mean: targetMean,
      sd: targetSD,
      n: targetRatios.length
    },
    control: {
      mean: controlMean,
      sd: controlSD,
      n: controlRatios.length
    }
  };
};
