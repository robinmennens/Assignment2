//GENERAL VARIABLES ---------------------------------
var colorScales = {
  none: d3.scaleOrdinal(["blue"]),
  count: d3.scaleQuantize().domain([0, 159]).range([      
    d3.rgb(170, 225, 0),
    d3.rgb(191, 225, 0),
    d3.rgb(213, 225, 0),
    d3.rgb(234, 225, 0),
    d3.rgb(255, 255, 0), 
    d3.rgb(255, 232, 0),
    d3.rgb(255, 212, 0),
    d3.rgb(255, 191, 0),
    d3.rgb(255, 170, 0),
    d3.rgb(255, 127, 0),
    d3.rgb(255, 106, 0),
    d3.rgb(255, 85, 0),
    d3.rgb(255, 64, 0),
    d3.rgb(255, 42, 0),
    d3.rgb(255, 21, 0),
    d3.rgb(255, 0, 0)]),
  group: d3.scaleOrdinal(d3.schemeCategory10)
}

//maps values to colors
var c = colorScales["group"];

// contains data about the relations between nodes
var matrix = [];
// contains data about the nodes themselves
var nodes = [];


// MATRIX VARIABLES ------------------------------------------------

//set up the margins, width and height of the svg to be constructed
var margin = {top: 100, right: 0, bottom: 0, left: 100},
    width = 640,
    height = 640;

//x is a ordinal scale (text values) and it uses the width of the svg to map to
//z is a scale that linearly maps the number of occurences of a "pair" to a value
var x = d3.scaleBand().range([0, width]),
    z = d3.scaleLinear().domain([0, 4]).clamp(true);
    
noColor = "#E8E6E5";  // (M) the color of the empty cells

//select panel-body and add an svg to it
var svg = d3.select(".matrix").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("margin-left", -margin.left + "px")
    .style("display", "block")
    .style("margin", "auto")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


// GRAPH VARIABLES --------------------------------------------------


width2 = 740,
height2 = 550;

var svg2 = d3.select(".forcedirected").append("svg")
    .attr("width", width2)
    .attr("height", height2)   
    .style("display", "block")
    .style("margin", "auto");    

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(width2 / 2, (height2 / 2) + 35));


// FOCUS GRAPH VARIABLES --------------------------------------------


width3 = 740,
height3 = 210;

var svg3 = d3.select(".focusgraph").append("svg")
    .attr("width", width3)
    .attr("height", height3)   
    .style("display", "block")
    .style("margin", "auto");    

var simulation2 = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(width2 / 2, (height2 / 2)));


// DATA INITIALIZATION ----------------------------------------------


//get the data
d3.json("miserables/les_miserables.json", function(error, miserables) {
  if (error) throw error

  //set up matrix, array of nodes and total nr of nodes  
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
    //order based on clustering
    group: d3.range(n).sort(function(a, b) { return nodes[b].group - nodes[a].group; })
  };

  //when the order dropdown value is changed, change the sort order
  d3.select("#order").on("change", function() {
    order(this.value);
  });

  //when the color dropdown value is changed, change the sort order
  d3.select("#coloring").on("change", function() {
    recolor(this.value);
  });

  // MATRIX SETUP --------------------------------------------------


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
      .attr("y", x.bandwidth() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "end")
      .text(function(d, i) { return nodes[i].label; })
      .on("click", onNodeClick);  // (M) attach a function to call on click

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
      .attr("y", x.bandwidth() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "start")
      .text(function(d, i) { return nodes[i].label; })
      .on("click", onNodeClick);  // (M) attach a function to call on click

  function row(row) {
    var cell = d3.select(this).selectAll(".cell")
        // (M) we don't filter anymore for cells that have z!
        // Doing in this way we have a cell for every pair of characters
        // To refer to the cells that actually represent a relationship we have to check if z >= 
        .data(row/*.filter(function(d) { return d.z; })*/) 
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d) { return x(d.x); })
        .attr("width", x.bandwidth())
        .attr("height", x.bandwidth())
        .style("fill-opacity", function(d) { 1/*return z(d.z)*/; })
        //color the rectangle based on cluster.. check if the endpoints of the pair belong to the same cluster
        // (M) this changed!!!
        .style("fill", function(d) {
            if (nodes[d.x].group == nodes[d.y].group) {
              // if the cell refers to a relationship between 2 characters in the same group
              return c(nodes[d.x].group);
            } else if (d.z >= 1) {
              // if the cell still refers to some relationship
              return null;
            } else {
              // if the cell is an empty one
              return noColor;
            }
          })
        /*.on("click", onCellClick)*/
        .on("mouseover", onMouseOver)
        .on("mouseout", onMouseOut)
        .on("click", onLinkClick)
        .append("title")
        .text(function(d) { return d.z; });
  }

  //called when the mouse moves over a cell
  function onMouseOver(p) {
    d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
    d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
  }

  //called when the mouse moves out of a cell
  function onMouseOut() {
    d3.selectAll("text").classed("active", false);
  }

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


  // GRAPH STARTS HERE --------------------------------------------------


  var edge = svg2.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(miserables.edges)
    .enter().append("line")
      .attr("stroke-width", function(d) { return 1/*Math.sqrt(d.value)*/; })
    .on("click", onLinkClick);

  var node = svg2.append("g")
      .attr("class", "nodes")
    .selectAll("circle")
    .data(miserables.nodes)
    .enter().append("circle")
      .attr("r", 5)
      .attr("fill", function(d) { return c(d.group); })
      .on("click", onNodeClick)
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

  node.append("title")
      .text(function(d) { return d.label; });

  simulation
      .nodes(miserables.nodes)
      .on("tick", ticked);

  simulation.force("link")
      .links(miserables.edges);

  function ticked() {
    edge
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  }


  // GENERAL FUNCTIONS HERE ---------------------------------------------


  //function called to change the colors of the visualizations
  function recolor(value) {
    //change the scale
    c = colorScales[value];

    d3.selectAll(".cell")
    .style("fill", function(d) {
      if(d.z >= 1){
        if(value == "count"){
          return c(d.z); 
        } else if (value == "group"){
          if(nodes[d.x].group == nodes[d.y].group){
            return c(nodes[d.x].group); 
          } else {
            return null;
          }
        } else {
            return(c(d.z));
        }
      } else {
        return noColor;
      }     
    })

    //update the graph
    d3.selectAll("circle")
    .attr("fill", function(d, i) {
      if(value == "count"){
        return c(nodes[i].count) 
      } else {
        return c(nodes[i].group); 
      }
    })
  }

  /** (M) WORKING ON THIS */
  //called when a name is clicked
  function onNodeClick(d, i){
    console.log("node clicked");
    console.log(d);
    console.log(i);
    var radius;

    d3.selectAll("circle").filter(function(p){ return i == p.id; })
      .style("r", function(){ console.log(this.r); console.log(this.r == 5); return 10; })
  }

  /** (M) WORKING ON THIS */
  //called when a cell is clicked
  function onLinkClick(d){
    console.log("link clicked");
    /*d3.selectAll("circle").filter(function(node){ return d.text == node.title; })
      .style("r", 8);*/
  } 

  function setFocusGraphNode(d, i){

    //clear the svg
    svg3.selectAll("*").remove();
    
    /* (R) WORKING ON THIS
    var focusedge = svg3.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(miserables.edges)
    .enter().append("line")
      .attr("stroke-width", function(d) { return 1/*Math.sqrt(d.value)*//*; })
    .on("click", onLinkClick);

  var node = svg2.append("g")
      .attr("class", "nodes")
    .selectAll("circle")
    .data(miserables.nodes)
    .enter().append("circle")
      .attr("r", 5)
      .attr("fill", function(d) { return c(d.group); })
      .on("click", onNodeClick)
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

  node.append("title")
      .text(function(d) { return d.label; });

  simulation
      .nodes(miserables.nodes)
      .on("tick", ticked);

  simulation.force("link")
      .links(miserables.edges);*/
  }

});


// FORCE DIRECTED GRAPH FUNCTIONS -------------------------------


function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}
