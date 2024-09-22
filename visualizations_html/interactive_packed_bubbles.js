// Load the CSV file
d3.csv("../data/vgsales.csv").then(data => {
    // Convert sales data to numbers and remove rows with missing values
    data = data.filter(d => d.Publisher && d.Genre && d.Name && !isNaN(d.Global_Sales));
    data.forEach(d => {
        d.Global_Sales = parseFloat(d.Global_Sales) || 0; // Ensure Global_Sales is a number
    });

    // Extract unique publishers and genres for the dropdowns
    const publishers = Array.from(new Set(data.map(d => d.Publisher.trim()))).sort();
    const genres = Array.from(new Set(data.map(d => d.Genre.trim()))).sort();

    // Populate the publisher dropdown
    const publisherSelect = d3.select("#publisher-select");
    publishers.forEach(publisher => {
        publisherSelect.append("option")
            .attr("value", publisher)
            .text(publisher);
    });

    // Populate the genre dropdown
    const genreSelect = d3.select("#genre-select");
    genres.forEach(genre => {
        genreSelect.append("option")
            .attr("value", genre)
            .text(genre);
    });

    // Function to filter and render the bubbles and data table based on selections
    function updateChart() {
        const selectedPublisher = publisherSelect.node().value;
        const selectedGenre = genreSelect.node().value;

        // Filter data based on selections
        let filteredData = data;
        if (selectedPublisher !== "all") {
            filteredData = filteredData.filter(d => d.Publisher === selectedPublisher);
        }
        if (selectedGenre !== "all") {
            filteredData = filteredData.filter(d => d.Genre === selectedGenre);
        }

        // Sort the filtered data by Global Sales in descending order
        filteredData.sort((a, b) => b.Global_Sales - a.Global_Sales);

        // Update the data table
        const tbody = d3.select("#sales-table tbody");
        tbody.selectAll("tr").remove(); // Clear existing rows
        filteredData.forEach(row => {
            const tr = tbody.append("tr");
            tr.append("td").text(row.Name);
            tr.append("td").text(row.Genre);
            tr.append("td").text(row.Publisher);
            tr.append("td").text(row.Global_Sales.toFixed(2));
        });

        // Convert the filtered data into a hierarchical structure
        const hierarchyData = {
            name: "Root",
            children: d3.groups(filteredData, d => d.Publisher, d => d.Genre).map(([publisher, genres]) => ({
                name: publisher,
                children: genres.map(([genre, games]) => ({
                    name: genre,
                    children: games.map(game => ({
                        name: game.Name,
                        size: game.Global_Sales // Use Global_Sales for the bubble size
                    }))
                }))
            }))
        };

        // Clear existing chart content
        d3.select("#chart").selectAll("*").remove();

        // Set up dimensions
        const width = 1000;
        const height = 1000;

        // Create the SVG container and append to #chart div
        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        // Create a hierarchy from the data
        const root = d3.hierarchy(hierarchyData)
            .sum(d => d.size)
            .sort((a, b) => b.value - a.value);

        // Create the packed layout
        const pack = d3.pack()
            .size([width, height])
            .padding(3);

        // Apply the packed layout to the hierarchy data
        pack(root);

        // Draw the bubbles
        const nodes = svg.selectAll("circle")
            .data(root.descendants())
            .enter()
            .append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => d.r)
            .style("fill", (d) => {
                if (d.depth === 1) return "lightblue";     // Publisher level
                else if (d.depth === 2) return "lightgreen"; // Genre level
                else return "lightcoral";                  // Game level
            })
            .style("stroke", "#000")
            .style("stroke-width", 1)
            .on("mouseover", function(event, d) {
                if (d.depth === 3) {
                    d3.select(this).attr("stroke", "black").attr("stroke-width", 2);
                    svg.append("text")
                        .attr("id", "hoverLabel")
                        .attr("x", d.x)
                        .attr("y", d.y)
                        .attr("dy", "-1em")
                        .attr("text-anchor", "middle")
                        .style("font-size", "20px")
                        .text(d.data.name);
                }
            })
            .on("mouseout", function(event, d) {
                if (d.depth === 3) {
                    d3.select(this).attr("stroke", "#000").attr("stroke-width", 1);
                    svg.select("#hoverLabel").remove();
                }
            })
            .append("title")
            .text(d => `${d.data.name}: ${d.value ? d.value.toLocaleString() + "M sales" : ""}`);

        // Adding genre labels
        svg.selectAll("text.genre")
            .data(root.descendants().filter(d => d.depth === 2))
            .enter()
            .append("text")
            .attr("class", "genre")
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("dy", "0.3em")
            .attr("text-anchor", "middle")
            .style("font-size", "30px")
            .style("pointer-events", "none")
            .text(d => d.data.name);
    }

    // Attach event listeners to update the chart when selections change
    publisherSelect.on("change", updateChart);
    genreSelect.on("change", updateChart);

    // Initial chart rendering
    updateChart();
});
