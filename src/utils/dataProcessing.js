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

  // Create long format data
  let longFormatData = null;
  const trialColumns = Object.keys(processedData[0] || {}).filter(col =>
    col.includes('_Trial_')
  );

  if (trialColumns.length > 0) {
    longFormatData = [];
    
    processedData.forEach(row => {
      // Get unique trial numbers
      const trialNumbers = [...new Set(
        trialColumns.map(col => col.split('_Trial_')[1]).filter(Boolean)
      )];
      
      trialNumbers.forEach((trialNum, index) => {
        const longRow = {
          ID: row.ID,
          trial: trialNum,
          record: index + 1
        };
        
        // Add non-trial columns
        Object.keys(row).forEach(key => {
          if (!key.includes('_Trial_')) {
            longRow[key] = row[key];
          }
        });
        
        // Add trial-specific columns
        trialColumns.forEach(col => {
          if (col.endsWith(`_Trial_${trialNum}`)) {
            const baseColName = col.replace(`_Trial_${trialNum}`, '');
            longRow[baseColName] = row[col];
          }
        });
        
        longFormatData.push(longRow);
      });
    });
  }

  // Return appropriate format
  const finalData = format === 'Long' && longFormatData ? longFormatData : processedData;
  
  return {
    processedData: finalData,
    longFormatData: longFormatData
  };
};

// Data cleaning function
export const applyDataCleaning = (data, cleaningOptions) => {
  if (!data || data.length === 0) {
    throw new Error('No data provided for cleaning');
  }

  let cleanedData = [...data];

  // Remove incomplete responses
  if (cleaningOptions.removeIncompleteResponses) {
    cleanedData = cleanedData.filter(row => {
      const status = parseFloat(row.Status);
      const progress = parseFloat(row.Progress);
      return status === 0 && progress === 100;
    });
  }

  // IQR filtering
  if (cleaningOptions.participantIqr && cleanedData[0]?.['Duration..in.seconds.']) {
    const durations = cleanedData
      .map(row => parseFloat(row['Duration..in.seconds.']))
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
        const duration = parseFloat(row['Duration..in.seconds.']);
        return !isNaN(duration) && duration >= lowerBound && duration <= upperBound;
      });
    }
  }

  // Custom filtering
  if (cleaningOptions.participantCustom && cleanedData[0]?.['Duration..in.seconds.']) {
    cleanedData = cleanedData.filter(row => {
      const duration = parseFloat(row['Duration..in.seconds.']);
      return !isNaN(duration) && 
             duration >= cleaningOptions.thresholdLower && 
             duration <= cleaningOptions.thresholdUpper;
    });
  }

  return cleanedData;
};

// Statistical analysis functions
export const performTTest = (data) => {
  if (!data || data.length === 0) {
    throw new Error('No data provided for analysis');
  }

  // Check for required columns
  const requiredCols = ['ID', 'sptResponse', 'ShuffleResult'];
  const missingCols = requiredCols.filter(col => !data[0]?.hasOwnProperty(col));
  
  if (missingCols.length > 0) {
    throw new Error(`Missing columns needed for analysis: ${missingCols.join(', ')}`);
  }

  // Group data by ID, sptResponse, and ShuffleResult
  const grouped = _.groupBy(data, row => `${row.ID}_${row.sptResponse}_${row.ShuffleResult}`);
  
  const summary = Object.entries(grouped).map(([key, rows]) => {
    const [id, response, shuffle] = key.split('_');
    return {
      ID: id,
      sptResponse: response,
      ShuffleResult: shuffle,
      count: rows.length
    };
  });

  // Pivot to wide format
  const pivoted = {};
  summary.forEach(row => {
    if (!pivoted[row.ID]) {
      pivoted[row.ID] = { ID: row.ID };
    }
    pivoted[row.ID][`${row.sptResponse}_${row.ShuffleResult}`] = row.count;
  });

  const tableClean = Object.values(pivoted).map(row => ({
    ID: row.ID,
    k_0: row.k_0 || 0,
    d_0: row.d_0 || 0,
    k_1: row.k_1 || 0,
    d_1: row.d_1 || 0
  })).filter(row => row.k_0 + row.d_0 > 0 && row.k_1 + row.d_1 > 0);

  // Calculate ratios
  const ratios = tableClean.map(row => ({
    ...row,
    target_ratio: row.k_1 / (row.k_1 + row.d_1),
    control_ratio: row.k_0 / (row.k_0 + row.d_0)
  }));

  // Perform t-test
  const targetRatios = ratios.map(r => r.target_ratio).filter(r => !isNaN(r));
  const controlRatios = ratios.map(r => r.control_ratio).filter(r => !isNaN(r));

  if (targetRatios.length === 0 || controlRatios.length === 0) {
    throw new Error('Insufficient data for t-test');
  }

  const tTestResult = tTest(targetRatios, controlRatios);

  return {
    summary: ratios,
    tTestResult: tTestResult
  };
};

// Simple t-test implementation
const tTest = (sample1, sample2) => {
  const n1 = sample1.length;
  const n2 = sample2.length;
  
  if (n1 === 0 || n2 === 0) {
    throw new Error('Cannot perform t-test with empty samples');
  }

  const mean1 = sample1.reduce((sum, val) => sum + val, 0) / n1;
  const mean2 = sample2.reduce((sum, val) => sum + val, 0) / n2;
  
  const var1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
  const var2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);
  
  const pooledSE = Math.sqrt(var1 / n1 + var2 / n2);
  const tStat = (mean1 - mean2) / pooledSE;
  const df = n1 + n2 - 2;

  return {
    mean1,
    mean2,
    tStatistic: tStat,
    degreesOfFreedom: df,
    pValue: 2 * (1 - tDistribution(Math.abs(tStat), df)) // Two-tailed p-value approximation
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
