//set up the margins, width and height of the svg to be constructed
var margin = {top: 80, right: 0, bottom: 10, left: 100},
    width = 640,
    height = 640;

//x is a ordinal scale (text values) and it uses the width of the svg to map to
//z is a scale that linearly maps the number of occurences of a "pair" to a value
//c is a color scale: Constructs a new ordinal scale with a range of ten categorical colors:
var x = d3.scale.ordinal().rangeBands([0, width]),
    z = d3.scale.linear().domain([0, 4]).clamp(true),
    c = d3.scale.category10().domain(d3.range(10));

//select panel-body and add an svg to it
var svg = d3.select(".matrix").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("margin-left", -margin.left + "px")
    .style("display", "block")
    .style("margin", "auto")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//get the data
d3.json("miserables/les_miserables.json", function(miserables) {
  //set up matrix, array of nodes and total nr of nodes
  var matrix = [],
      nodes = miserables.nodes,
      n = nodes.length;

  // Compute index per node.
  nodes.forEach(function(node, i) {
    node.index = i;
    node.count = 0;
    //this initializes the twoD matrix, for each i -> character we create an array of n other values
    //here these new values are tuples {x coordinate, y coordinate, and a z value}
    //the z value indicates the number of occurrences of this "pair"
    matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
  });

  // Convert links to matrix; count character occurrences.
  miserables.edges.forEach(function(edge) {
    //when a "source" and "target" occur together, then we need to add this occurence value
    //to 4 cases: both source and target occured with themselves, and with each other.
    matrix[edge.source][edge.target].z += edge.value;
    matrix[edge.target][edge.source].z += edge.value;
    matrix[edge.source][edge.source].z += edge.value;
    matrix[edge.target][edge.target].z += edge.value;

    //the nodes array contains the occurence of each character
    //for both the source and target we add the edge value
    nodes[edge.source].count += edge.value;
    nodes[edge.target].count += edge.value;
  });

  // Precompute the orders.
  var orders = {
    //alphabetical order
    name: d3.range(n).sort(function(a, b) { return d3.ascending(nodes[a].label, nodes[b].label); }),
    //order based on the frequencies of the nodes
    count: d3.range(n).sort(function(a, b) { return nodes[b].count - nodes[a].count; }),
    //group: d3.range(n).sort(function(a, b) { return nodes[b].group - nodes[a].group; })
  };

  // The default sort order.
  x.domain(orders.name);

  svg.append("rect")
      .attr("class", "background")
      .attr("width", width)
      .attr("height", height);

  //set up rows
  var row = svg.selectAll(".row")
      .data(matrix)
    .enter().append("g")
      .attr("class", "row")
      .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
      .each(row);

  row.append("line")
      .attr("x2", width);

  row.append("text")
      .attr("x", -6)
      .attr("y", x.rangeBand() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "end")
      .text(function(d, i) { return nodes[i].label; });

  //set up columns
  var column = svg.selectAll(".column")
      .data(matrix)
    .enter().append("g")
      .attr("class", "column")
      .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

  column.append("line")
      .attr("x1", -width);

  column.append("text")
      .attr("x", 6)
      .attr("y", x.rangeBand() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "start")
      .text(function(d, i) { return nodes[i].label; });

  function row(row) {
    var cell = d3.select(this).selectAll(".cell")
        .data(row.filter(function(d) { return d.z; }))
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d) { return x(d.x); })
        .attr("width", x.rangeBand())
        .attr("height", x.rangeBand())
        .style("fill-opacity", function(d) { return z(d.z); })
        .style("fill", function(d) { return nodes[d.x].group == nodes[d.y].group ? c(nodes[d.x].group) : null; })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);
  }

  function mouseover(p) {
    d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
    d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
  }

  function mouseout() {
    d3.selectAll("text").classed("active", false);
  }

  //when the order dropdown value is changed, change the sort order
  d3.select("#order").on("change", function() {
    order(this.value);
  });

  //function called to change the order of the axis
  function order(value) {
    //change the domain
    x.domain(orders[value]);

    var t = svg.transition().duration(2500);

    t.selectAll(".row")
        .delay(function(d, i) { return x(i) * 4; })
        .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
      .selectAll(".cell")
        .delay(function(d) { return x(d.x) * 4; })
        .attr("x", function(d) { return x(d.x); });

    t.selectAll(".column")
        .delay(function(d, i) { return x(i) * 4; })
        .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
  }
});
