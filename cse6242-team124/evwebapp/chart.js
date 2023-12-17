const width = 1024;
const height = 600;
const padding = 80;

const xMinRange = padding;
const xMaxRange = width - padding * 2;
const yMinRange = height - padding;
const yMaxRange = padding;

const patternDateISO = "%Y-%m-%d";
const patternDateDisplay="%b %d, %Y"

// Define functions to parse date.
const parseDateYearWeek = d3.timeParse("%Y %W");
const parseDateISO = d3.timeParse(patternDateISO);

// Convert Dates to strings.
const formatTimeYear = d3.timeFormat("%Y");
const formatDateISO = d3.timeFormat(patternDateISO);
const formatDateDisplay = d3.timeFormat(patternDateDisplay);

// Convert numbers to strings.
const formatPrice = d3.format("$.2f");
const formatInteger = d3.format(",.0f");

// Global default parameters.
const daysInWeek = 7;
const daysInYear = 365;
const numYearsFuture = 10;
const numDaysFuture = daysInYear * numYearsFuture;

// Related to data.
let extentGasPriceDate;
let extentGasPrice;
let extentWeeklyEVDate;
let extentWeeklyEVCount;
let extentWeeklyEVCountPrediction;
let extentWeeklyEVRangeDate;
let extentWeeklyEVRangeEVRange;

let minDate;
let maxDate;
let minPredictionDate;
let maxPredictionDate;
let maxGasPrice;
let maxGasPriceInput;
let minEVCount;
let maxEVCount;
let maxEVRangeInput;
let minEVRange;
let maxEVRange;

let predictedEVCount;

let xScale;
let yScaleEVCount;
let yScaleEVRange;
let yScaleGP;

let xAxis;
let yAxisEVCount;
let yAxisGP;
let yAxisEVRange;

let lineEVCount;
let lineEVRange;
let lineGP;
let linePrediction;

const lineColors = d3.schemeCategory10;
const colorIndexEVCount = 0;
const colorIndexEVRange = 1;
const colorIndexGP = 2;
const colorIndexMVReg = 8;
const colorIndexPrediction = 3;

// Circle radius
const rSmall = 1.15;
const rMedium = 5;

// Legend
const legendSize = 15;

// User input
let date;
let gasPrice;
let evRange;

// Tooltips
const tooltipLabels = {date: "Date", gasPrice: "Gas Price",
    evRange: "EV Range", evCount: "EV Count", evCountPredicted: "Weekly Predicted EV Count"};

let regression;

// Read from SQLite database.
const dbConfig = { locateFile: filename => 'lib/sql-wasm.wasm' };
const dbPath = "data/evdata.db";
const sqlPromise = initSqlJs(dbConfig);
const dataPromise = fetch(dbPath).then(res => res.arrayBuffer());
let db;

const sqlGasPriceQuery = `select Year, Week, Price from wa_gas_price_weekly
    order by Year, Week`;

const sqlWeeklyEVDataQuery = `select TransactionYear, TransactionWeek, EVCount
    from ev_title_reg_weekly_count order by TransactionYear, TransactionWeek`;

const sqlWeeklyEVRangeDataQuery = `select Year, Week, EVCount, AvgElectricRange
    from ev_range_weekly order by Year, Week`;

const sqlFinalJoinedDataQuery=`select a.date, a.EVCount, a.AvgElectricRange, a.Year, a.Week, b.Price
    from ev_range_weekly as a
    left join wa_gas_price_weekly as b
    on a.Year = b.Year and a.Week = b.Week`

let gasPriceData = [];
let weeklyEVData = [];
let weeklyEVRangeData = [];
let finalJoinedData = [];

// Display legend immediately before fetching data.
displayLegend();

Promise.all([sqlPromise, dataPromise]).then(function([SQL, buf])
{
    db = new SQL.Database(new Uint8Array(buf));
}).then(
    function()
    {
        Promise.all
        (
            [
                db.exec(sqlGasPriceQuery)[0],
                db.exec(sqlWeeklyEVDataQuery)[0],
                db.exec(sqlWeeklyEVRangeDataQuery)[0],
                db.exec(sqlFinalJoinedDataQuery)[0]
            ]
        ).then(plotLinearRegression)
    });

function plotLinearRegression(data)
{
    initFromData(data);

    updateFormControls();

    plotLineChart();

    enableAllTooltips();

    displayPlot();
}

function displayLegend()
{
    d3.select("#legend-gas-price")
        .attr("width", legendSize)
        .attr("height", legendSize)
        .append("rect")
        .attr("height", legendSize)
        .attr("width", legendSize)
        .style("fill", lineColors[colorIndexGP]);

    d3.select("#legend-ev-range")
        .attr("width", legendSize)
        .attr("height", legendSize)
        .append("rect")
        .attr("height", legendSize)
        .attr("width", legendSize)
        .style("fill", lineColors[colorIndexEVRange]);

    d3.select("#legend-ev-count")
        .attr("width", legendSize)
        .attr("height", legendSize)
        .append("rect")
        .attr("height", legendSize)
        .attr("width", legendSize)
        .style("fill", lineColors[colorIndexEVCount]);

    d3.select("#legend-ev-count-prediction")
        .attr("width", legendSize)
        .attr("height", legendSize)
        .append("rect")
        .attr("height", legendSize)
        .attr("width", legendSize)
        .style("fill", lineColors[colorIndexMVReg]);
}

function displayPlot()
{
    // Hide placeholder.
    d3.select("#loading-message").classed("visually-hidden", true);

    // Display actual plot.
    d3.select("#svg-reg-1").classed("visually-hidden", false);
}

function initFromData(data)
{
    const gasPriceDataRaw = data[0].values;
    const weeklyEVDataRaw = data[1].values;
    const weeklyEVRangeDataRaw = data[2].values;
    const finalJoinedDataRaw = data[3].values;

    gasPriceDataRaw.forEach(function(v, i)
    {
        gasPriceData[i] =
            {
                date: parseDateYearWeek(v[0].toString() + " " + v[1].toString()),
                year: v[0],
                week: v[1],
                price: v[2]
            }
    });
    weeklyEVDataRaw.forEach(function (v, i)
    {
        weeklyEVData[i] =
            {
                date: parseDateYearWeek(v[0].toString() + " " + v[1].toString()),
                year: v[0],
                week: v[1],
                evCount: v[2]
            }
    });
    weeklyEVRangeDataRaw.forEach(function (v, i)
    {
        weeklyEVRangeData[i] =
            {
                date: parseDateYearWeek(v[0].toString() + " " + v[1].toString()),
                year: v[0],
                week: v[1],
                evCount: v[2],
                evRange: v[3]
            }
    });

    finalJoinedDataRaw.forEach(function (v, i)
    {
        finalJoinedData[i] =
            {
                date: parseDateISO(v[0]),
                Count: v[1],
                Range: v[2],
                Year: v[3],
                Week: v[4],
                Price: v[5]
            }
    });

    //Create the dataset to use in the multivariate regression
    const formattedData = finalJoinedData.map(point => {
        return {
          dependent: point.Count,
          independent1: point.Range,
          independent2: point.Price
        };
    });

    // Separate the dependent variable and independent variables
    const dependentVariable = formattedData.map(point => [point.dependent]);
    const independentVariables = formattedData.map(point => [point.independent1, point.independent2]);

    // Create a multivariate linear regression model
    regression = new ML.MultivariateLinearRegression(independentVariables, dependentVariable);

    // Get the coefficients (weights) of the regression model
    const coefficients = regression.weights;

    for (let i = 0; i < finalJoinedData.length; i++)
    {
        finalJoinedData[i].Prediction = parseFloat(coefficients[2])
            + parseFloat(coefficients[0]) * parseFloat(finalJoinedData[i].Range)
            + parseFloat(coefficients[1]) * parseFloat(finalJoinedData[i].Price);

        if (finalJoinedData[i].Prediction < 0)
        {
            finalJoinedData[i].Prediction = 0;
        }
    }

    extentGasPriceDate = d3.extent(gasPriceData, function(d) { return d.date; });
    extentGasPrice = d3.extent(gasPriceData, function(d) { return d.price; });
    extentWeeklyEVDate = d3.extent(weeklyEVData, function(d) { return d.date; });
    extentWeeklyEVCount = d3.extent(weeklyEVData, function(d) { return d.evCount; });
    extentWeeklyEVCountPrediction = d3.extent(finalJoinedData, function(d) { return d.Prediction; });
    extentWeeklyEVRangeDate = d3.extent(weeklyEVRangeData, function(d) { return d.date; });
    extentWeeklyEVRangeEVRange = d3.extent(weeklyEVRangeData, function(d) { return d.evRange; });

    // Prediction date starts the day after current EV count data ends.
    minPredictionDate = new Date(extentWeeklyEVDate[1].getTime());
    minPredictionDate.setDate(minPredictionDate.getDate() + 1);

    // Prediction date ends X number of years after prediction starts.
    maxPredictionDate = new Date(minPredictionDate.getTime());
    maxPredictionDate.setDate(maxPredictionDate.getDate() + numDaysFuture);

    // Gas price input should not be unbounded.  Max = 10 * maximum in existing data.
    maxGasPriceInput = Math.floor(extentGasPrice[1] * 10);

    // EV range input should not be unbounded.  Max = 10 * maximum in existing data.
    maxEVRangeInput = Math.floor(extentWeeklyEVRangeEVRange[1] * 10);

    initMinMaxScalesAxes();

    lineEVCount = d3.line()
        .x(function(d) { return xScale(d.date); })
        .y(function(d) { return yScaleEVCount(d.evCount); })
        .curve(d3.curveMonotoneX);

    lineEVRange = d3.line()
        .x(function(d) { return xScale(d.date); })
        .y(function(d) { return yScaleEVRange(d.evRange); })
        .curve(d3.curveMonotoneX);

    lineGP = d3.line()
        .x(function(d) { return xScale(d.date); })
        .y(function(d) { return yScaleGP(d.price); })
        .curve(d3.curveMonotoneX);

    linePrediction = d3.line()
        .x(function(d) { return xScale(d.date); })
        .y(function(d) { return yScaleEVCount(d.Prediction); })
        .curve(d3.curveMonotoneX);
}

function initMinMaxScalesAxes()
{   
    minDate = d3.min([extentGasPriceDate[0], extentWeeklyEVRangeDate[0], extentWeeklyEVDate[0]]);
    maxDate = d3.max([extentGasPriceDate[1], extentWeeklyEVRangeDate[1], extentWeeklyEVDate[1]]);
    maxGasPrice = extentGasPrice[1];
    minEVCount = extentWeeklyEVCount[0];
    maxEVCount = d3.max([extentWeeklyEVCount[1], extentWeeklyEVCountPrediction[1]]);
    minEVRange = extentWeeklyEVRangeEVRange[0];
    maxEVRange = extentWeeklyEVRangeEVRange[1];

    let paddedMaxDate = new Date(maxDate.getTime());
    paddedMaxDate.setFullYear(paddedMaxDate.getFullYear() + 1);
    maxDate = paddedMaxDate;

    xScale = d3.scaleTime()
        .domain([minDate, maxDate])
        .range([xMinRange, xMaxRange]);

    yScaleEVCount = d3.scaleLinear()
        .domain([0, maxEVCount])
        .range([yMinRange, yMaxRange]);

    yScaleEVRange = d3.scaleLinear()
        .domain([0, maxEVRange])
        .range([yMinRange, yMaxRange]);

    yScaleGP = d3.scaleLinear()
        .domain([0, maxGasPrice])
        .range([yMinRange, yMaxRange]);

    xAxis = d3.axisBottom()
        .scale(xScale)
        .tickFormat(formatTimeYear);

    yAxisEVCount = d3.axisRight()
        .scale(yScaleEVCount);

    yAxisGP = d3.axisLeft()
        .scale(yScaleGP);

    yAxisEVRange = d3.axisLeft()
        .scale(yScaleEVRange);
}

function updateMinMaxScalesAxes()
{
    minDate = d3.min([extentGasPriceDate[0], extentWeeklyEVRangeDate[0], extentWeeklyEVDate[0], date, minPredictionDate]);
    maxDate = d3.max([extentGasPriceDate[1], extentWeeklyEVRangeDate[1], extentWeeklyEVDate[1], date, maxPredictionDate]);
    maxGasPrice = 1.1 * d3.max([extentGasPrice[1], gasPrice]);
    minEVCount = d3.min([extentWeeklyEVCount[0]]);
    maxEVCount = d3.max([extentWeeklyEVCount[1], extentWeeklyEVCountPrediction[1], predictedEVCount]);
    minEVRange = d3.min([extentWeeklyEVRangeEVRange[0], evRange]);
    maxEVRange = d3.max([extentWeeklyEVRangeEVRange[1], evRange]);

    updateScalesAxes();
}

function updateScalesAxes()
{
    xScale.domain([minDate, maxDate]);
    yScaleEVCount.domain([0, maxEVCount]);
    yScaleEVRange.domain([0, maxEVRange]);
    yScaleGP.domain([0, maxGasPrice]);

    xAxis.scale(xScale);
    yAxisEVCount.scale(yScaleEVCount);
    yAxisGP.scale(yScaleGP);
    yAxisEVRange.scale(yScaleEVRange);
}

function plotLineChart()
{
    // Actual plot.
    d3.select("#svg-reg-1")
        .attr("width", width)
        .attr("height", height);

    d3.select("#title-reg-1")
        .attr("x", "50%")
        .attr("y", padding / 2);

    plotAxes();

    const lines = d3.select("#lines-reg-1");

    // Plot line for gas price data.
    lines.append("g")
        .attr("id", "gas-price-line")
        .append("path")
        .datum(gasPriceData)
        .attr("d", function(d) { return lineGP(d); })
        .style("stroke", lineColors[colorIndexGP]);

    // Plot line for EV range data.
    lines.append("g")
        .attr("id", "ev-range-line")
        .append("path")
        .datum(weeklyEVRangeData)
        .attr("d", function(d) { return lineEVRange(d); })
        .style("stroke", lineColors[colorIndexEVRange]);

    // Plot line for EV count data.
    lines.append("g")
        .attr("id", "ev-count-line")
        .append("path")
        .datum(weeklyEVData)
        .attr("d", function(d) { return lineEVCount(d); })
        .style("stroke", lineColors[colorIndexEVCount]);

    // Plot line for prediction data.
    lines.append("g")
        .attr("id", "mv-prediction-line")
        .append("path")
        .datum(finalJoinedData)
        .attr("d", function(d) { return linePrediction(d); })
        .style("stroke", lineColors[colorIndexMVReg]);

    d3.select("#gas-price-line path")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);
    
    //Add mouseover events for the lines
    d3.select("#ev-range-line path")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);
    
    d3.select("#ev-count-line path")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    d3.select("#mv-prediction-line path")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);
        
    //define the line styles for the mouseover events
    d3.select("#svg-reg-1").append("defs")
        .append("line-filter")
        .attr("id", "line-shadow")
        .append("feDropShadow")
        .attr("dx", 0)
        .attr("dy", 0)
        .attr("stdDeviation", 2)
        .attr("flood-color", "#888888")

    plotLinePoints();
}

function handleMouseOver() {
    d3.select(this)
        .style("stroke-width", 6) 
        .style("line-filter", "url(#line-shadow)");
}

function handleMouseOut() {
    d3.select(this)
        .style("stroke-width", 2)  
        .style("line-filter", null); 
}
function handleLineMouseOver(lineSelector) {
    d3.select(lineSelector)
        .style("stroke-width", 6)
        .attr("line-filter", "url(#line-shadow)");  // Apply the filter for shadow
}

function handleLineMouseOut(lineSelector) {
    d3.select(lineSelector)
        .style("stroke-width", 2)
        .attr("line-filter", null);  // Remove the filter
}

function handleMouseOverCircle() {
    d3.select(this)
        .transition()
        .attr("r", rMedium * 2);
}

function handleMouseOutCircle() {
    d3.select(this)
        .transition()
        .attr("r", rMedium);
}

function plotLinePoints()
{
    // Plot points for gas price line.
    d3.select("#line-points-gas-price")
        .selectAll("circle")
        .data(gasPriceData)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return xScale(d.date.getTime()); })
        .attr("cy", function(d) { return yScaleGP(d.price); })
        .attr("r", rSmall)
        .attr("data-bs-toggle", "tooltip")
        .on("mouseover", function(d) {
            handleLineMouseOver("#gas-price-line path");
        })
        .on("mouseout", function(d) {
            handleLineMouseOut("#gas-price-line path");
        })
        .attr("data-bs-html", "true")
        .attr("data-bs-title", function(d)
        {
            return `${tooltipLabels.date}: <b>${formatDateDisplay(d.date)}</b><br />
                ${tooltipLabels.gasPrice}: <b>${formatPrice(d.price)}</b>`;
        })
        .style("fill", lineColors[colorIndexGP])
        .style("stroke", lineColors[colorIndexGP]);

    // Plot points for EV count line.
    d3.select("#line-points-ev-count")
        .selectAll("circle")
        .data(weeklyEVData)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return xScale(d.date.getTime()); })
        .attr("cy", function(d) { return yScaleEVCount(d.evCount); })
        .attr("r", rSmall)
        .attr("data-bs-toggle", "tooltip")
        .on("mouseover", function(d) {
            handleLineMouseOver("#ev-count-line path");
        })
        .on("mouseout", function(d) {
            handleLineMouseOut("#ev-count-line path");
        })
        .attr("data-bs-html", "true")
        .attr("data-bs-title", function(d)
        {
            return `${tooltipLabels.date}: <b>${formatDateDisplay(d.date)}</b><br />
                ${tooltipLabels.evCount}: <b>${formatInteger(d.evCount)}</b>`;
        })
        .style("fill", lineColors[colorIndexEVCount])
        .style("stroke", lineColors[colorIndexEVCount]);

    // Plot points for EV range line.
    d3.select("#line-points-ev-range")
        .selectAll("circle")
        .data(weeklyEVRangeData)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return xScale(d.date.getTime()); })
        .attr("cy", function(d) { return yScaleEVRange(d.evRange); })
        .attr("r", rSmall)
        .attr("data-bs-toggle", "tooltip")
        .on("mouseover", function(d) {
            handleLineMouseOver("#ev-range-line path");
        })
        .on("mouseout", function(d) {
            handleLineMouseOut("#ev-range-line path");
        })
        .attr("data-bs-html", "true")
        .attr("data-bs-title", function(d)
        {
            return `${tooltipLabels.date}: <b>${formatDateDisplay(d.date)}</b><br />
                ${tooltipLabels.evRange}: <b>${formatInteger(d.evRange)}</b>`;
        })
        .style("fill", lineColors[colorIndexEVRange])
        .style("stroke", lineColors[colorIndexEVRange]);

    // Plot points for EV count prediction line.
    d3.select("#line-points-mv-prediction")
        .selectAll("circle")
        .data(finalJoinedData)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return xScale(d.date.getTime()); })
        .attr("cy", function(d) { return yScaleEVCount(d.Prediction); })
        .attr("r", rSmall)
        .attr("data-bs-toggle", "tooltip")
        .on("mouseover", function(d) {
            handleLineMouseOver("#mv-prediction-line path");
        })
        .on("mouseout", function(d) {
            handleLineMouseOut("#mv-prediction-line path");
        })
        .attr("data-bs-html", "true")
        .attr("data-bs-title", function(d)
        {
            return `${tooltipLabels.date}: <b>${formatDateDisplay(d.date)}</b><br />
                ${tooltipLabels.evCountPredicted}: <b>${formatInteger(d.Prediction)}</b>`;
        })
        .style("fill", lineColors[colorIndexMVReg])
        .style("stroke", lineColors[colorIndexMVReg]);
}

function updateLinePoints()
{
    // Plot points for gas price line.
    d3.select("#line-points-gas-price")
        .selectAll("circle")
        .data(gasPriceData)
        .attr("cx", function(d) { return xScale(d.date.getTime()); })
        .attr("cy", function(d) { return yScaleGP(d.price); });

    // Plot points for EV count line.
    d3.select("#line-points-ev-count")
        .selectAll("circle")
        .data(weeklyEVData)
        .attr("cx", function(d) { return xScale(d.date.getTime()); })
        .attr("cy", function(d) { return yScaleEVCount(d.evCount); });

    // Plot points for EV range line.
    d3.select("#line-points-ev-range")
        .selectAll("circle")
        .data(weeklyEVRangeData)
        .attr("cx", function(d) { return xScale(d.date.getTime()); })
        .attr("cy", function(d) { return yScaleEVRange(d.evRange); });

    // Plot points for EV count prediction line.
    d3.select("#line-points-mv-prediction")
        .selectAll("circle")
        .data(finalJoinedData)
        .attr("cx", function(d) { return xScale(d.date.getTime()); })
        .attr("cy", function(d) { return yScaleEVCount(d.Prediction); });
}

function plotAxes()
{
    const plot = d3.select("#plot-reg-1");

    d3.select("#x-axis-reg-1")
        .attr("transform", "translate(0," + yMinRange + ")")
        .call(xAxis);

    plot.select("text.x.axis.label")
        .attr("x", "50%")
        .attr("y", yMinRange)
        .attr("dy", "3em");

    d3.select("g.y.axis.left")
        .attr("transform", "translate(" + xMinRange + ",0)")
        .call(yAxisGP);

    plot.select("text.y.axis.label.left")
        .attr("transform", "rotate(-90)")
        .attr("x", -yMinRange / 2)
        .attr("y", xMinRange / 2)
        .attr("dy", "-1em");
    
    d3.select("g.y.axis.right_range")
        .attr("transform", "translate(" + xMaxRange + ",0)")
        .call(yAxisEVRange);

    d3.select("g.y.axis.right_ev")
        .attr("transform", "translate(" + xMaxRange + ",0)")
        .call(yAxisEVCount);
        

    plot.select("text.y.axis.label.right")
        .attr("transform", "rotate(-90)")
        .attr("x", -yMinRange / 2)
        .attr("y", xMaxRange)
        .attr("dy", "5em")
        .attr("dx", "5em");
}

function updateFormControls()
{
    d3.select("#date")
        .attr("min", formatDateISO(minPredictionDate))
        .attr("max", formatDateISO(maxPredictionDate));

    d3.select("#gasPrice")
        .attr("max", maxGasPriceInput);

    d3.select("#evRange")
        .attr("max", maxEVRangeInput);

    d3.select("#inputForm")
        .on("submit", processFormSubmit);
}

function processFormSubmit(event)
{
    // Prevent form refresh.
    event.preventDefault();

    date = parseDateISO(document.getElementById("date").value);
    gasPrice = parseFloat(document.getElementById("gas-price").value);
    evRange = parseFloat(document.getElementById("ev-range").value);

    calculateEVCountPrediction();

    updateMinMaxScalesAxes();

    updateLineChart();

    updateUserSelectedPoints();

    enableAllTooltips();
}

function calculateEVCountPrediction()
{
    // Get the coefficients (weights) of the regression model
    const coefficients = regression.weights;

    predictedEVCount = parseFloat(coefficients[2])
        + parseFloat(coefficients[0]) * parseFloat(evRange)
        + parseFloat(coefficients[1]) * parseFloat(gasPrice);

    if (predictedEVCount < 0)
    {
        predictedEVCount = 0;
    }
}

function updateLineChart()
{
    plotAxes();

    // Plot line for gas price data.
    d3.select("#gas-price-line")
        .select("path")
        .datum(gasPriceData)
        .attr("d", function(d) { return lineGP(d); })
        .style("stroke", lineColors[colorIndexGP]);

    // Plot line for EV range data.
    d3.select("#ev-range-line")
        .select("path")
        .datum(weeklyEVRangeData)
        .attr("d", function(d) { return lineEVRange(d); })
        .style("stroke", lineColors[colorIndexEVRange]);

    // Plot line for EV count data.
    d3.select("#ev-count-line")
        .select("path")
        .datum(weeklyEVData)
        .attr("d", function(d) { return lineEVCount(d); })
        .style("stroke", lineColors[colorIndexEVCount]);

    d3.select("#mv-prediction-line")
        .select("path")
        .datum(finalJoinedData)
        .attr("d", function(d) { return linePrediction(d); })
        .style("stroke", lineColors[colorIndexMVReg]); 

    updateLinePoints();
}

function updateUserSelectedPoints()
{
    d3.selectAll("circle.selected")
        .remove();

    const circles = d3.select("#circles-reg-1");

    circles.append("circle")
        .attr("class", "selected")
        .attr("cx", function(d) { return xScale(date.getTime()); })
        .attr("cy", function(d) { return yScaleEVRange(evRange); })
        .on("mouseover", handleMouseOverCircle)
        .on("mouseout", handleMouseOutCircle)
        .attr("r", rMedium)
        .attr("data-bs-toggle", "tooltip")
        .attr("data-bs-html", "true")
        .attr("data-bs-title", function(d)
        {
            return `${tooltipLabels.date}: <b>${formatDateDisplay(date)}</b><br />
                ${tooltipLabels.evRange}: <b>${formatInteger(evRange)}</b>`;
        })
        .style("fill", lineColors[colorIndexEVRange])
        .style("stroke", lineColors[colorIndexEVRange]);

    circles.append("circle")
        .attr("class", "selected")
        .attr("cx", function(d) { return xScale(date.getTime()); })
        .attr("cy", function(d) { return yScaleGP(gasPrice); })
        .on("mouseover", handleMouseOverCircle)
        .on("mouseout", handleMouseOutCircle)
        .attr("r", rMedium)
        .attr("data-bs-toggle", "tooltip")
        .attr("data-bs-html", "true")
        .attr("data-bs-title", function(d)
        {
            return `${tooltipLabels.date}: <b>${formatDateDisplay(date)}</b><br />
                ${tooltipLabels.gasPrice}: <b>${formatPrice(gasPrice)}</b>`;
        })
        .style("fill", lineColors[colorIndexGP])
        .style("stroke", lineColors[colorIndexGP]);

    const predictedPoint = [{ date: date, Prediction: predictedEVCount }];

    circles.append("circle")
        .attr("class", "selected")
        .data(predictedPoint)
        .attr("cx", function(d) { return xScale(d.date); })
        .attr("cy", function(d) { return yScaleEVCount(d.Prediction); })
        .on("mouseover", handleMouseOverCircle)
        .on("mouseout", handleMouseOutCircle)
        .attr("r", rMedium)
        .attr("data-bs-toggle", "tooltip")
        .attr("data-bs-html", "true")
        .attr("data-bs-title", function(d)
        {
            return `${tooltipLabels.date}: <b>${formatDateDisplay(d.date)}</b><br />
                ${tooltipLabels.evCountPredicted}: <b>${formatInteger(d.Prediction)}</b>`;
        })
        .style("fill", lineColors[colorIndexPrediction]);

    d3.select("#prediction-results-title")
        .text(`${tooltipLabels.evCountPredicted} of ${formatInteger(predictedEVCount)}`);
}

function enableAllTooltips()
{
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle = "tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}
