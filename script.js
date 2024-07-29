const margin = { top: 20, right: 30, bottom: 180, left: 60 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const parseDate = d3.timeParse("%m/%d/%Y");

const x = d3.scaleBand().range([0, width]).padding(0.1);
const y = d3.scaleLinear().range([height, 0]);

const svg = d3.select("#graph").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

function createMainChart(data) {
  const startYear = parseInt(document.getElementById("startYear").value) || d3.min(data, d => d.Year);
  const endYear = parseInt(document.getElementById("endYear").value) || d3.max(data, d => d.Year);

  const filteredData = data.filter(d => d.Year >= startYear && d.Year <= endYear);
  const crashesByYear = Array.from(d3.group(filteredData, d => d.Year), ([key, value]) => ({ key, value: value.length }));

  x.domain(crashesByYear.map(d => d.key));
  y.domain([0, d3.max(crashesByYear, d => d.value)]);

  svg.selectAll("*").remove();

  svg.selectAll(".bar")
    .data(crashesByYear)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.key))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.value))
    .attr("height", d => height - y(d.value))
    .on("click", (event, d) => {
      createDrillDownChart(data, d.key);
    });

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => d % 20 === 0)).tickFormat(d3.format("d")))
    .append("text")
    .attr("y", margin.bottom - 50)
    .attr("x", width / 2)
    .attr("text-anchor", "middle")
    .attr("stroke", "black")
    .text("Year");

  svg.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .attr("stroke", "black")
    .text("Airplane Crashes");

  const annotations = [
    {
      note: {
        label: "Start Year: 1908",
      },
      x: x(1908) + x.bandwidth() / 2,
      y: height,
      dy: 40,
      dx: 0,
      subject: {
        y1: height,
        y2: height + 40
      },
    },
    {
      note: {
        label: "End Year: 2009",
      },
      x: x(2009) + x.bandwidth(),
      y: height,
      dy: 40,
      dx: -100,
      subject: {
        x1: x(2009) + x.bandwidth(),
        x2: x(2009) + x.bandwidth(),
        y1: height,
        y2: height + 40
       },
    },
  ];

  const makeAnnotations = d3.annotation()
    .annotations(annotations);

  svg.append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);

  d3.select(".controls-container").style("display", "flex");
  d3.select("#back-button").style("display", "none");
}

function createDrillDownChart(data, year) {
    const yearData = data.filter(d => d.Year === year);
    const fatalitiesByOperator = Array.from(d3.group(yearData, d => d.Operator), ([key, value]) => ({
      key,
      value: d3.sum(value, d => d.Fatalities),
      crashes: value.length,
      deadliestCrash: value.reduce((prev, current) => (prev.Fatalities > current.Fatalities) ? prev : current)
    }));
  
    const top3Operators = fatalitiesByOperator.sort((a, b) => b.value - a.value).slice(0, 3);
  
    const drillX = d3.scaleBand().range([0, width]).padding(0.1);
    const drillY = d3.scaleLinear().range([height, 0]);
  
    drillX.domain(fatalitiesByOperator.map(d => d.key));
    drillY.domain([0, d3.max(fatalitiesByOperator, d => d.value)]);
  
    svg.selectAll("*").remove();
  
    svg.selectAll(".bar")
      .data(fatalitiesByOperator)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => drillX(d.key))
      .attr("width", drillX.bandwidth())
      .attr("y", d => drillY(d.value))
      .attr("height", d => height - drillY(d.value))
      .on("mouseover", (event, d) => {
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`
          <strong>Operator:</strong> ${d.key}<br/>
          <strong>Biggest Crash:</strong> occurred on ${d.deadliestCrash.Date.toLocaleDateString()} - ${d.deadliestCrash.Summary}<br/>
          <strong>Number of Crashes:</strong> ${d.crashes}
        `)
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", d => {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(drillX))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "12px");
  
    svg.append("g")
      .attr("class", "y axis")
      .call(d3.axisLeft(drillY))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 25)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("stroke", "black")
      .text("Fatalities");
  
    svg.append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .attr("stroke", "black")
      .text("Operator");
  
    d3.select(".controls-container").style("display", "none");
    d3.select("#back-button").style("display", "block");

    const annotations = top3Operators.map((d, i) => ({
      note: {
        label: `Operator: ${d.key}\nFatalities: ${d.value}\nCrashes: ${d.crashes}`,
        title: ["Most Fatalities", "2nd Most Fatalities", "3rd Most Fatalities"][i]
      },
      x: width / 2 - 100 + i * 200,
      y: -10,
      dx: 0,
      dy: 20,
      disable: ["connector"]
    }));
  
    annotations.push({
      note: {
        label: `Current Year: ${year}`,
        title: ""
      },
      x: width - 120,
      y: 200,
      dx: 0,
      dy: 0,
      title: {
        "font-size": "20px",
        "font-weight": "bold"
      }
    });
  
    const makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotations);
  
    svg.append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations);
  }
  
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
d3.csv("data/Airplane_Crashes_and_Fatalities_Since_1908.csv").then(data => {
  data.forEach(d => {
    d.Date = parseDate(d.Date);
    d.Year = d.Date.getFullYear();
    d.Fatalities = +d.Fatalities;
  });

  createMainChart(data);

  document.getElementById("resetButton").addEventListener("click", () => {
    document.getElementById("startYear").value = "";
    document.getElementById("endYear").value = "";
    createMainChart(data);
  });

  document.getElementById("updateButton").addEventListener("click", () => {
    createMainChart(data);
  });

  document.getElementById("back-button").addEventListener("click", () => {
    createMainChart(data);
  });
});