const width = 1600, height = 800;
const margin = { top: 60, right: 40, bottom: 60, left: 200 };

let currentScene = 0;
let data = [], genres = [];
let selectedGenre = "All";
let selectedYear = 2016;

const scenes = [
  "Regional Sales Over Time",
  "Platform Popularity by Year (Stacked)",
  "Top Games by Genre and Year"
];

const svg = d3.select("#vis");
svg.append("g").attr("class", "content");

// Load CSV
d3.csv("https://mccrary4.github.io/vgsales.csv", d => ({
  name: d.Name,
  platform: d.Platform,
  year: +d.Year,
  genre: d.Genre,
  publisher: d.Publisher,
  NA_Sales: +d.NA_Sales,
  EU_Sales: +d.EU_Sales,
  JP_Sales: +d.JP_Sales,
  Other_Sales: +d.Other_Sales,
  Global_Sales: +d.Global_Sales
})).then(raw => {
  data = raw.filter(d => !isNaN(d.year) && d.year > 1980 && d.year <= 2016);

  const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
  years.forEach(y => {
    d3.select("#yearSelect").append("option").attr("value", y).text(y);
  });
  d3.select("#yearSelect").property("value", selectedYear);

  genres = Array.from(new Set(data.map(d => d.genre))).sort();
  genres.unshift("All");
  genres.forEach(g => {
    d3.select("#drillSelect").append("option").attr("value", g).text(g);
  });
  d3.select("#drillSelect").property("value", selectedGenre);

  renderScene();
});

// Navigation
d3.select("#next").on("click", () => {
  if (currentScene < scenes.length - 1) currentScene++;
  renderScene();
});
d3.select("#back").on("click", () => {
  if (currentScene > 0) currentScene--;
  renderScene();
});
d3.select("#drillSelect").on("change", function () {
  selectedGenre = this.value;
  if (currentScene === 2) renderScene();
});
d3.select("#yearSelect").on("change", function () {
  selectedYear = +this.value;
  if (currentScene === 2) renderScene();
});

function renderScene() {
  svg.select(".content").html("");
  d3.select("#scene-title").text(`Scene ${currentScene + 1}: ${scenes[currentScene]}`);
  d3.select("#scene3-controls").style("display", currentScene === 2 ? "inline-block" : "none");

  if (currentScene === 0) drawScene1();
  else if (currentScene === 1) drawScene2();
  else if (currentScene === 2) drawScene3();
}

// ----------- Scene 1: Regional Sales Over Time -----------
function drawScene1() {
  const content = svg.select(".content");

  const years = d3.rollups(data, v => ({
    NA: d3.sum(v, d => d.NA_Sales),
    EU: d3.sum(v, d => d.EU_Sales),
    JP: d3.sum(v, d => d.JP_Sales),
    Other: d3.sum(v, d => d.Other_Sales)
  }), d => d.year).map(([year, sales]) => ({ year, ...sales })).sort((a, b) => a.year - b.year);

  const regions = ["NA", "EU", "JP", "Other"];
  const color = d3.scaleOrdinal().domain(regions).range(["#e63946", "#457b9d", "#2a9d8f", "#f4a261"]);
  const x = d3.scaleLinear().domain(d3.extent(years, d => d.year)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(years, d => Math.max(d.NA, d.EU, d.JP, d.Other))]).nice().range([height - margin.bottom, margin.top]);

  const line = region => d3.line().x(d => x(d.year)).y(d => y(d[region]));

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "6px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("visibility", "hidden");

  const focusLine = content.append("line")
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "3,3")
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .style("visibility", "hidden");

  regions.forEach(region => {
    content.append("path")
      .datum(years)
      .attr("fill", "none")
      .attr("stroke", color(region))
      .attr("stroke-width", 2)
      .attr("d", line(region));
  });

  content.selectAll(".overlay")
    .data(years)
    .enter()
    .append("rect")
    .attr("x", d => x(d.year) - 5)
    .attr("width", 10)
    .attr("y", margin.top)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "transparent")
    .on("mouseover", (event, d) => {
      focusLine.attr("x1", x(d.year)).attr("x2", x(d.year)).style("visibility", "visible");
      tooltip.html(`
        <strong>Year:</strong> ${d.year}<br/>
        NA: ${d.NA.toFixed(2)}M<br/>
        EU: ${d.EU.toFixed(2)}M<br/>
        JP: ${d.JP.toFixed(2)}M<br/>
        Other: ${d.Other.toFixed(2)}M
      `).style("visibility", "visible");
    })
    .on("mousemove", event => {
      tooltip.style("top", (event.pageY - 40) + "px").style("left", (event.pageX + 15) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
      focusLine.style("visibility", "hidden");
    });

  content.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  content.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  content.append("text").attr("x", width / 2).attr("y", margin.top - 25).attr("text-anchor", "middle").attr("font-size", "16px")
    .text("Regional Video Game Sales Over Time (1981–2016)");

  content.append("text").attr("x", width / 2).attr("y", height - 10).attr("text-anchor", "middle").attr("font-size", "12px").text("Year");
  content.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", margin.left - 60).attr("text-anchor", "middle").attr("font-size", "12px").text("Sales (millions)");

  const legend = content.append("g").attr("transform", `translate(${width - 140}, ${margin.top})`);
  regions.forEach((region, i) => {
    const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    g.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(region));
    g.append("text").attr("x", 18).attr("y", 10).text(region + " Sales").attr("font-size", "12px");
  });
}

// ----------- Scene 2: Stacked Bar Chart by Year -----------
function drawScene2() {
  const content = svg.select(".content");

  const platforms = Array.from(new Set(data.map(d => d.platform))).sort();

  const nested = d3.rollups(
    data,
    v => {
      const result = {};
      platforms.forEach(p => result[p] = 0);
      v.forEach(d => result[d.platform] += d.Global_Sales);
      return result;
    },
    d => d.year
  );

  const stackedData = nested.map(([year, values]) => ({ year: +year, ...values }))
    .sort((a, b) => a.year - b.year);

  const keys = platforms;

  const x = d3.scaleBand()
    .domain(stackedData.map(d => d.year))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stackedData, d => d3.sum(keys, k => d[k]))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(keys)
    .range(d3.schemeTableau10.concat(d3.schemeSet3, d3.schemePaired));

  const stack = d3.stack().keys(keys);
  const series = stack(stackedData);

  // === Tooltip Setup ===
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "8px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("visibility", "hidden");

  // === Draw Bars ===
  content.selectAll("g.layer")
    .data(series)
    .enter()
    .append("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d.map(item => ({ ...item, key: d.key })))
    .enter()
    .append("rect")
    .attr("x", d => x(d.data.year))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .on("mouseover", (event, d) => {
      tooltip
        .style("visibility", "visible")
        .html(`
          <strong>Platform:</strong> ${d.key}<br/>
          <strong>Year:</strong> ${d.data.year}<br/>
          <strong>Sales:</strong> ${ (d[1] - d[0]).toFixed(2) }M
        `);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("top", (event.pageY - 40) + "px")
        .style("left", (event.pageX + 15) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
    });

  // Axes
  content.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  content.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Labels
  content.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Yearly Sales by Platform (Stacked)");

  content.append("text")
    .attr("x", width / 2)
    .attr("y", height - margin.bottom + 40)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Year");

  content.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", margin.left - 50)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Sales (millions)");

  // Legend
  const legend = content.append("g")
    .attr("transform", `translate(${margin.left + 10}, ${margin.top})`);

  keys.forEach((platform, i) => {
    const g = legend.append("g").attr("transform", `translate(${(i % 3) * 150}, ${Math.floor(i / 3) * 20})`);
    g.append("rect").attr("width", 10).attr("height", 10).attr("fill", color(platform));
    g.append("text").attr("x", 15).attr("y", 9).text(platform).attr("font-size", "11px");
  });
}




// ----------- Scene 3: Drill Down Bar Chart by Genre & Year -----------
function drawScene3() {
  const content = svg.select(".content");
  let filtered = data.filter(d => d.year === selectedYear);
  if (selectedGenre !== "All") {
    filtered = filtered.filter(d => d.genre === selectedGenre);
  }

  const topGames = d3.rollups(filtered, v => d3.sum(v, d => d.Global_Sales), d => d.name)
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const x = d3.scaleLinear().domain([0, d3.max(topGames, d => d.sales)]).nice().range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(topGames.map(d => d.name)).range([margin.top, height - margin.bottom]).padding(0.1);

  content.selectAll("rect")
    .data(topGames)
    .enter().append("rect")
    .attr("x", margin.left)
    .attr("y", d => y(d.name))
    .attr("width", d => x(d.sales) - margin.left)
    .attr("height", y.bandwidth())
    .attr("fill", "#f4a261");

  content.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
  content.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  content.append("text").attr("x", width / 2).attr("y", margin.top - 20).attr("text-anchor", "middle").attr("font-size", "16px")
    .text(`Top Games – ${selectedGenre === "All" ? "All Genres" : selectedGenre}, ${selectedYear}`);

  content.append("text").attr("x", width / 2).attr("y", height - 10).attr("text-anchor", "middle").attr("font-size", "12px").text("Global Sales (millions)");
  content.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", margin.left - 180).attr("text-anchor", "middle").attr("font-size", "12px").text("Game Title");
}
