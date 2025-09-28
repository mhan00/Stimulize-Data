# Old Faithful Geyser Data - React Conversion

This is a React/JavaScript conversion of the original R Shiny application that displays an interactive histogram of Old Faithful geyser eruption durations.

## Original R Shiny App vs React Conversion

### Original R Shiny (`server.R` + `ui.R`)
- **Data**: Used R's built-in `faithful` dataset (column 2 - eruption durations)
- **UI**: Sidebar layout with slider input (1-50 bins, default 30)
- **Visualization**: Base R histogram with dark gray bars and white borders
- **Reactivity**: Automatic plot updates when slider value changes

### React Conversion Features
- **Exact functionality replication**: Same interactive histogram with bin control
- **Same dataset**: Old Faithful eruption duration data (272 observations)
- **Same styling**: Dark gray bars with white borders, matching R's appearance
- **Same UI layout**: Title header, sidebar with slider, main plot area
- **Same interactivity**: Real-time histogram updates as you move the slider

## Technology Stack

- **React 18** - UI framework
- **Chart.js 4** + **react-chartjs-2** - Histogram visualization
- **Vite** - Build tool and development server
- **CSS3** - Styling to match Shiny's bootstrap theme

## Installation and Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Project Structure

```
faithful-histogram-react/
├── src/
│   ├── components/
│   │   └── HistogramChart.jsx    # Chart.js histogram component
│   ├── data/
│   │   └── faithful.js           # Old Faithful dataset
│   ├── App.jsx                   # Main application component
│   ├── App.css                   # Styling (matches Shiny theme)
│   └── main.jsx                  # React app entry point
├── index.html                    # HTML template
├── package.json                  # Dependencies and scripts
├── vite.config.js               # Vite configuration
└── README.md                    # This file
```

## Key Implementation Details

### Histogram Calculation
The React version implements the same histogram binning logic as R:
- Calculates bin edges using `seq(min(x), max(x), length.out = bins + 1)`
- Counts frequencies for each bin
- Handles edge cases (values equal to max)

### Styling
- **Colors**: Matches R's `col='darkgray'` and `border='white'`
- **Layout**: Replicates Shiny's `fluidPage` with `sidebarLayout`
- **Typography**: Uses system fonts similar to Bootstrap
- **Responsive**: Works on mobile devices

### Data
The `faithful` dataset contains 272 observations of Old Faithful geyser eruptions:
- **Variable**: Eruption duration in minutes
- **Range**: ~1.6 to 5.1 minutes
- **Distribution**: Bimodal (short ~2min and long ~4.5min eruptions)

## Comparison: R Shiny vs React

| Aspect | R Shiny | React |
|--------|---------|-------|
| **Lines of Code** | ~25 lines | ~150 lines |
| **Setup Time** | 5 minutes | 30 minutes |
| **Learning Curve** | Low (for R users) | Medium |
| **Customization** | Limited | High |
| **Deployment** | shinyapps.io | Vercel/Netlify |
| **Performance** | Good | Excellent |
| **Styling Control** | Bootstrap themes | Full CSS control |

## Running the Application

After starting the dev server (`npm run dev`), you'll see:

1. **Title**: "Old Faithful Geyser Data"
2. **Sidebar**: Slider to control number of bins (1-50)
3. **Main area**: Interactive histogram that updates in real-time
4. **Responsive design**: Works on desktop and mobile

The histogram shows the bimodal distribution of Old Faithful eruption durations, with most eruptions being either short (~2 minutes) or long (~4.5 minutes).

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support  
- Safari: Full support
- Mobile browsers: Responsive design

## License

This project replicates the functionality of R's built-in `faithful` dataset example, converted to modern web technologies.
