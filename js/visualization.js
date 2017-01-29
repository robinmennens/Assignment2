//GENERAL VARIABLES ---------------------------------
var colorScales = {
  none: d3.scaleOrdinal(["darkcyan"]),
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
  group: d3.scaleOrdinal(d3.schemeCategory20)
}

//maps values to colors
var c = colorScales["group"];

// contains data about the relations between nodes
var matrix = [];
// contains data about the nodes themselves
var nodes = [];

//Tooltip
var tip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);


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
height2 = 460;

var svg2 = d3.select(".forcedirected").append("svg")
    .attr("width", width2)
    .attr("height", height2)   
    .style("display", "block")
    .style("margin", "auto");    

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody().strength(-35))
    .force("center", d3.forceCenter(width2 / 2, (height2 / 2) + 35));

var radius = {
  normal: 5,
  selected: 8,
  clicked: 10
}


// FOCUS GRAPH VARIABLES --------------------------------------------

width3 = 740,
height3 = 300;

var svg3 = d3.select(".focusgraph").append("svg")
             .attr("width", width3)
             .attr("height", height3)   
             .style("display", "block")
             .style("margin", "auto");


// SCALE VARIABLES --------------------------------------------------

width4 = 370,
height4 = 20;

var svg4 = d3.select(".scale").append("svg")
.attr("width", width4)
.attr("height", height4)   
.style("display", "block")
.style("margin", "auto");


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
    node.degree = 0;
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

    nodes[edge.source].degree += 1;
    nodes[edge.target].degree += 1;
  });

  // Precompute the orders.
  var orders = {
    //alphabetical order
    name: d3.range(n).sort(function(a, b) { return d3.ascending(nodes[a].label, nodes[b].label); }),
    //order based on the frequencies of the nodes
    count: d3.range(n).sort(function(a, b) { return nodes[b].count - nodes[a].count; }),
    //order based on clustering
    group: d3.range(n).sort(function(a, b) { 
      if (nodes[b].group == nodes[a].group){
        return nodes[b].count - nodes[a].count; 
      } else {
        return nodes[b].group - nodes[a].group;
      }
    }),
    connections: d3.range(n).sort(function(a, b){ return nodes[b].degree - nodes[a].degree; })
  };

  var o = orders["name"]; // important!!!

  //when the order dropdown value is changed, change the sort order
  d3.select("#order").on("change", function() {
    reorder(this.value);
  });

  //when the color dropdown value is changed, change the sort order
  d3.select("#coloring").on("change", function() {
    recolor(this.value, true);
    if(this.value == "count") {
      showScale();
    } else {
      hideScale();
    }
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
      .on("click", onNodeClick)  // (M) attach a function to call on click
      .on("mouseover", onMouseOverText);

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
      .on("click", onNodeClick)  // (M) attach a function to call on click
      .on("mouseover", onMouseOverText);

  //add tooltip image
  svg.append("svg:image")
    .attr('x',-25)
    .attr('y',-25)
    .attr('width', 24)
    .attr('height', 24)
    .attr("xlink:href","http://images.clipartpanda.com/question-mark-icon-Question-Mark-Icon.jpg")
    .on("mouseover", function(d) {      
      tip.transition().duration(200).style("opacity", .9);
      tip.html("-Click on a name to focus on that person. <br/> -Hover over cells to see more information.<br />-Click on cells to focus on them.")
         .style("left", 115 + "px")
         .style("top", 140 + "px"); })
    .on("mouseout", function(d) {
      tip.transition()
        .duration(500)
        .style("opacity", 0); });

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
        .style("fill-opacity", 1)
        .style("fill", recolor(coloring.value, false))
        .on("click", onCellClick)
        .on("mouseover", onMouseOverCell)
        .on("mouseout", onMouseOutCell)
        .append("title").text(function(d) { return d.z; });
  }

  //called when the mouse moves over a cell
  function onMouseOverCell(p) {
    if (p.z > 0) { console.log(" ++++++ MOUSE OVER cell (" + p.y + ", " + p.x + ")"); }

    // show pointer if there is a relationship
    d3.select(this).filter(function(){ return p.z; }).style("cursor", "pointer");

    // highlight both row and column in the matrix
    selectRowColumn(p.y, p.x);

    // highlight the node(s) in the graph
    if (p.x == p.y) { selectNode(p.x); }
    else { if (p.z > 0) selectEdge(p.y, p.x); }
  }

  function onMouseOutCell(p) {
    // deselect the row and the column in the matrix
    selectRowColumn(p.y, p.x);
    // deselect the node(s) in the graph
    if (p.x == p.y) { selectNode(p.x); }
    else { if (p.z > 0) selectEdge(p.y, p.x); }

    if (p.z > 0) { console.log(" ------ MOUSE OUT cell (" + p.y + ", " + p.x + ")"); }
  }

  // highlights the corresponding row and column
  function selectRowColumn(r, c){
    // identify the corresponding row and row
    // * please notice that the filtering is necessary to filter out the selected cell
    var selectedRow = 
      d3.selectAll(".row").filter(function(d, j){ return j == r+1 })
        .selectAll(".cell").filter(function(d, j){ return j != c && d.z == 0; });
    var selectedColumn = 
      d3.selectAll(".row").filter(function(d, j){ return j != r+1 })
        .selectAll(".cell").filter(function(d, j){return j == c && d.z == 0;});

    // check separately if they are already selected and if they are not already marked
    var isRowSelected = 
      (selectedRow.attr("class").indexOf("activeCell") >= 0) 
      && (selectedRow.attr("class").indexOf("markedCell") == -1);
    var isColumnSelected = 
      (selectedColumn.attr("class").indexOf("activeCell") >= 0) 
      && (selectedColumn.attr("class").indexOf("markedCell") == -1);

    // downplay text on all rows and columns
    d3.selectAll(".row text").classed("active", false);
    d3.selectAll(".column text").classed("active", false);
    d3.selectAll(".row").selectAll(".cell").classed("activeCell", false);
    d3.selectAll(".column").selectAll(".cell").classed("activeCell", false);

    // highlight accordingly
    selectedRow.classed("activeCell", !isRowSelected);
    selectedColumn.classed("activeCell", !isColumnSelected);

    // highlight text on row and column
    if (!isRowSelected) {
      if (coloring.value == "count") {
        d3.selectAll(".row text").classed("active", function(d, j) { return j == r+2; }); 
      } else {
        d3.selectAll(".row text").classed("active", function(d, j) { return j == r; }); 
      } 
    }
    if (!isColumnSelected) {  
      d3.selectAll(".column text").classed("active", function(d, j) { return j == c; }); 
    }
  }

  function onCellClick(d){
    console.log(" ______ CLICK cell (" + d.x + ", " + d.y + ")");

    //remove the marked line
    svg2.selectAll(".markedLine")
    .classed("markedLine", false); //class is just used to identify it

    //hide all labels
    svg2.selectAll("text")
    .style("opacity", 0);

    // only cells with a relationship associated can be clicked
    if (d.z > 0) {
      // mark the cell in the matrix
      markRowColumn(d.y, d.x);
      // mark the node/edge in the graph
      if (d.x == d.y) {
         markNode(d.x);
      } else {
        markEdge(d.x, d.y, d);
      }
    }
  }  

  // IMPORTANT: THEY MUST BE CLASS VARIABLES
  var wasRowMarked = false;
  var wasColumnMarked = false;
  function markRowColumn(r, c) {

    // identify the corresponding row and row
    var markedRow = 
      d3.selectAll(".row").filter(function(d, j){ return j == r+1 })
        .selectAll(".cell").filter(function(d, j){ return j != c && d.z == 0; });
    var markedColumn = 
      d3.selectAll(".row").filter(function(d, j){ return j != r+1 })
        .selectAll(".cell").filter(function(d, j){return j == c && d.z == 0;});

    // check separately if they are already marked
    wasRowMarked = (markedRow.attr("class").indexOf("markedCell") >= 0);
    wasColumnMarked = (markedColumn.attr("class").indexOf("markedCell") >= 0);

    if (wasRowMarked && wasColumnMarked) { console.log(" <<< UNMARK cell (" + r + ", " + c + ")"); }
    if (!wasRowMarked || !wasColumnMarked) { console.log(" >>> MARK cell (" + r + ", " + c + ")"); }

    // clear all the previous marks and selections
    // * please notice that we cannot clear before not to lose the information about the clicked row/column
    d3.selectAll(".row text").classed("marked", false);
    d3.selectAll(".column text").classed("marked", false);
    d3.selectAll(".row").selectAll(".cell").classed("activeCell", false);
    d3.selectAll(".column").selectAll(".cell").classed("activeCell", false);
    d3.selectAll(".row").selectAll(".cell").classed("markedCell", false);
    d3.selectAll(".column cell").selectAll(".cell").classed("markedCell", false);

    // mark rows and columns accordingly
    markedRow.classed("markedCell", !wasRowMarked || !wasColumnMarked);
    markedColumn.classed("markedCell", !wasRowMarked || !wasColumnMarked);

    // mark text accordingly: if at least between row or column is to mark, we mark text on both row and column
    if (!wasRowMarked || !wasColumnMarked) {
      // mark row text
      if (coloring.value == "count"){
        d3.selectAll(".row text").classed("marked", function(d, j) { return j == r+2; }); 
      } else {
        d3.selectAll(".row text").classed("marked", function(d, j) { return j == r; }); 
      }
      // mark column text
      d3.selectAll(".column text").classed("marked", function(d, j) { return j == c; });
    }

    // if we have unclicked the cell, then we have also to select it after the unmarking
    if(wasRowMarked && wasColumnMarked){ selectRowColumn(r, c); }
  }

  function onMouseOverText(p, i) {
    console.log("i:" + i);
    if (coloring.value == "count"){
      d3.selectAll(".row text").classed("active", function(d, j) { return i+2 == j; }).style("cursor", "pointer");
    } else {
      d3.selectAll(".row text").classed("active", function(d, j) { return i == j; }).style("cursor", "pointer");
    }
    
    d3.selectAll(".column text").classed("active", function(d, j) { return i == j; }).style("cursor", "pointer");
  }


  // GRAPH STARTS HERE --------------------------------------------------

  var edge = svg2.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(miserables.edges)
    .enter().append("line")
      .attr("stroke-width", function(d) { return 1/*Math.sqrt(d.value)*/; });

  var node = svg2.append("g")
      .attr("class", "nodes")
    .selectAll("circle")
    .data(miserables.nodes)
    .enter().append("g");

  node.append("circle")
      .attr("r", radius.normal)
      .attr("fill", function(d) { return c(d.group); })
      .on("click", onNodeClick)
      .on("mouseover", mouseOverForceGraph)
      .on("mouseout", mouseOutForceGraph)
      .call(d3.drag().on("start", dragstarted)
                     .on("drag", dragged)
                     .on("end", dragended));

  //add the node labels
  var nodelabels = svg2.append("g")
    .attr("class", "nodelabels")
    .selectAll("text")
    .data(miserables.nodes)
    .enter().append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .classed("nodelabel", true)
      .style("opacity", 0)
      .style("pointer-events", "none")
      .text(function(d) {return d.label});

  simulation
    .nodes(miserables.nodes)
    .on("tick", ticked);

  simulation
    .force("link")
    .links(miserables.edges);

  //add tooltip image
  svg2.append("svg:image")
   .attr('x',0)
   .attr('y',0)
   .attr('width', 24)
   .attr('height', 24)
   .attr("xlink:href","http://images.clipartpanda.com/question-mark-icon-Question-Mark-Icon.jpg")
   .on("mouseover", function(d) {    

       tip.transition()
         .duration(200)
         .style("opacity", .9);

       tip.html("-Click on a node to focus on that person.<br/>-Drag the nodes around to rearrange the graph.")
         .style("left", 788 + "px")
         .style("top", 35 + "px");
    })
    .on("mouseout", function(d) {
       tip.transition()
         .duration(500)
         .style("opacity", 0);
    });

  reorder(order.value);
  recolor(coloring.value);


  // SCALE STARTS HERE --------------------------------------------

  function showScale(){
    for(i = 1; i < 159; i++){
      svg4.append("rect")
      .attr("width", 2)
      .attr("height", height4 - 2)
      .attr("x", (2 * i) + 17)
      .attr("y", 1)
      .attr("fill", c(i))
      .append("title")
      .text(i);
    }

    svg4.append("text")
      .attr("y", 15) 
      .attr("x", 8)  
      .classed("scaleText", true)   
      .text("1");

    svg4.append("text")
      .attr("y", 15)
      .attr("x", 336)
      .classed("scaleText", true)  
      .text("158");

  }

  function hideScale(){
    svg4.selectAll("*").remove();
  }


  // FORCE DIRECTED GRAPH FUNCTIONS -------------------------------

  function ticked() {
    edge
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.select("circle")
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

    nodelabels
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; });
  }

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

  function mouseOverForceGraph(d, i) {
    if (d.z > 0) { console.log(" ++++++ [ OVER node (" + i + ")"); }

    // show the pointer
    d3.select(this).style("cursor", "pointer");
    // select/unselect the row and the column in the matrix
    selectRowColumn(i, i);
    // select/unselect the node in the graph
    selectNode(i);
  }

  function showNodeLabel(id){
    //show node label    
    svg2.selectAll(".nodelabel")
    .filter(function(p) { return id == p.id; })
    .style("opacity", 1);
  }

  function hideNodeLabel(id){
    //show node label    
    svg2.selectAll(".nodelabel")
    .filter(function(p) { return id == p.id; })
    .style("opacity", 0);
  }

  function mouseOutForceGraph(d, i){    
    // select/unselect the row and the column in the matrix
    selectRowColumn(i, i);
    // select/unselect the node in the graph
    selectNode(i);
  }

  function selectNode(n){

    // check if the node was selected
    var selectedNode = svg2.selectAll("circle").filter(function(p){ return n == p.id; });
    var wasNodeClicked = (selectedNode.attr("r") == radius.clicked);
    var wasNodeSelected = (selectedNode.attr("r") == radius.selected);

    // if the node was already clicked we leave it clicked
    // otherwise we resize it accordingly
    selectedNode.attr("r", function(){
      if (wasNodeClicked) { 
        showNodeLabel(n);
        return radius.clicked; 
      }
      else { 
        if (wasNodeSelected) {
          hideNodeLabel(n);
          return radius.normal;
        } else {
          showNodeLabel(n);
          return radius.selected;
        }        
      }
    });
  }

  function selectEdge(n1, n2){
    selectNode(n1);
    selectNode(n2);
  }

  function onNodeClick(d, i, graph = true){
    //graph is true when a node was clicked in the force graph
    console.log(" ______ CLICK node (" + i + ")");

    // mark/unmark the cell on the grid
    markRowColumn(i, i);
    // mark/unmark the node in the graph
    markNode(i, graph);
  }

  function markNode(n, graph){
    // check if the node was clicked or selected
    var clickedNode = svg2.selectAll("circle").filter(function(p){ return n == p.id; });
    var wasNodeClicked = (clickedNode.attr("r") == radius.clicked);

    // shrink all the nodes except the selected one
    svg2.selectAll("circle")
    .filter( function(p) { return n != p.id; })
    .attr("r", radius.normal);

    //remove highlighted edges
    svg2.selectAll(".markedLine").classed("markedLine", false);

    // and also hide all labels
    svg2.selectAll("text").style("opacity", 0);

    if (wasNodeClicked && wasColumnMarked && wasRowMarked) {  }
    else { console.log(" >>> MARK node (" + n + ")"); }

    //transition to small
    if(wasNodeClicked && wasColumnMarked && wasRowMarked){
      clickedNode.transition().duration(250).attr("r", radius.normal);
    } else {
      clickedNode.transition().duration(250).attr("r", radius.clicked + 5);
    }

    // resize accordingly: if it was clicked, we shrink it to selected; if it was selected we enlarge it to clicked
    clickedNode.transition().delay(250).attr("r", function(){ 
      if(wasNodeClicked && wasColumnMarked && wasRowMarked) {
        if(graph){
          console.log(" <<< UNMARK node (" + n + ")");
          showNodeLabel(n); 
          svg3.selectAll("*").remove();
          return radius.selected; 
        } else {          
          svg3.selectAll("*").remove();
          return radius.normal; 
        }
      } else { 
        // show the focus on the node
        setFocusGraphNode(n);
        showNodeLabel(n);
        return radius.clicked; }
      });
  }

  function markEdge(n1, n2, e){ 

    showNodeLabel(n1);
    showNodeLabel(n2);   

    // check if the node 1 was clicked
    var clickedNode1 = svg2.selectAll("circle").filter(function(p){ return n1 == p.id; });
    var wasNode1Clicked = (clickedNode1.attr("r") == radius.clicked);

    // check if the node 1 was clicked
    var clickedNode2 = svg2.selectAll("circle").filter(function(p){ return n2 == p.id; });
    var wasNode2Clicked = (clickedNode2.attr("r") == radius.clicked);

    // shrink all the nodes
    svg2.selectAll("circle")
    .filter(function(p) { return n2 != p.id && n1 != p.id })
    .attr("r", radius.normal);

    if (wasNode1Clicked && wasNode2Clicked) { console.log(" <<< UNMARK edge (" + n1 + ", " + n2 + ")"); }
    else { console.log(" >>> MARK edge (" + n1 + ", " + n2 + ")"); }

    // if at least one of them is clicked we enlarge both
    // if both are clicked or normal we resize them accordingly
    if (wasNode1Clicked == wasNode2Clicked && wasNode1Clicked){
      //make them larger to pop out
      clickedNode1.transition().duration(250).attr("r", radius.selected - 2);
      clickedNode2.transition().duration(250).attr("r", radius.selected - 2);

      //shrink them back to the size we want
      clickedNode1.transition().delay(250).attr("r", radius.selected);
      clickedNode2.transition().delay(250).attr("r", radius.selected);

      //remove the marked line  
      svg2.selectAll(".markedLine").classed("markedLine", false);

      //clear the focus edge graph
      svg3.selectAll("*").remove();
    } else {
      clickedNode1.transition().duration(250).attr("r", radius.clicked + 5);
      clickedNode2.transition().duration(250).attr("r", radius.clicked + 5);

      clickedNode1.transition().delay(250).attr("r", radius.clicked);
      clickedNode2.transition().delay(250).attr("r", radius.clicked);

      svg2.selectAll("line")
      .filter(function(d) { return ((d.source.id == n1 && d.target.id == n2) || (d.source.id == n2 && d.target.id == n1))})
      .classed("markedLine", true);

      // show the edge focus graph
      setFocusGraphEdge(n1, n2, e);
    }

    


  }

  // GENERAL FUNCTIONS HERE ---------------------------------------------

  //function called to change the order of the axis
  function reorder(value) {
    //change the domain
    o = orders[value];
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

  //function called to change the colors of the visualizations
  function recolor(value, delay) {    
    //change the scale
    c = colorScales[value];

    //I had to do it like this.. changing the duration of the transition with an if statement
    //would delay the page load for some weird reason
    if(delay) {
      d3.selectAll(".cell")
      .transition()
      .duration(750)
      .style("fill", function(d) { return getCellColor(d, value);})
    } else {
      d3.selectAll(".cell")     
      .style("fill", function(d) { return getCellColor(d, value);})
    }

    //update the graph
    if(delay){
      svg2.selectAll("circle")
      .transition()
      .duration(750)
      .attr("fill", function(d, i) { return getNodeColor(d, i, value); });
    } else {
      svg2.selectAll("circle")      
      .attr("fill", function(d, i) { return getNodeColor(d, i, value); });
    }

    //also recolor the focus graph
    recolorfg(delay);
  }

  function getCellColor(d, value){
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
  }

  function getNodeColor(d, i, value){    
    if(value == "count"){
      return c(nodes[i].count) 
    } else {
      return c(nodes[i].group); 
    }
  }


  // FOCUS GRAPH FUNCTIONS HERE -------------------------------------

  var link2;
  var node2;
  var linklabels;
  var simulation2;

  function setFocusGraphNode(i){
    //only use i, d is different depending if text or a node was clicked    

    //clear the svg
    svg3.selectAll("*").remove();

    //add tooltip image
    svg3.append("svg:image")
     .attr('x',0)
     .attr('y',0)
     .attr('width', 24)
     .attr('height', 24)
     .attr("xlink:href","http://images.clipartpanda.com/question-mark-icon-Question-Mark-Icon.jpg")
     .on("mouseover", function(d) {        

         tip.transition()
           .duration(200)
           .style("opacity", .9);

         tip.html("-Values in the nodes represent the number of occurrences.<br/>-Hover over a node to see the number of occurrences of the related edge(s).<br/>-Click on a node to focus on that person.")
           .style("left", 788 + "px")
           .style("top", 495 + "px");
      })
      .on("mouseout", function(d) {
         tip.transition()
           .duration(500)
           .style("opacity", 0);
      });

    simulation2 = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge2", d3.forceManyBody().strength(-700));

    vertices = [];
    connections = [];

    var added = false;
    var sumedges = 0;

    for(connection in miserables.edges){      
      //if one end of the edge is connected to i
      if(miserables.edges[connection].source.id == i || miserables.edges[connection].target.id == i){
        var source = {count: miserables.edges[connection].source.count, 
                      group: miserables.edges[connection].source.group, 
                      id:    miserables.edges[connection].source.id, 
                      label: miserables.edges[connection].source.label};
        var target = {count: miserables.edges[connection].target.count, 
                      group: miserables.edges[connection].target.group, 
                      id:    miserables.edges[connection].target.id, 
                      label: miserables.edges[connection].target.label};

        //add the edge to the edges
        connections.push({index: connection, source: source.id, target: target.id, value: miserables.edges[connection].value})
        sumedges += miserables.edges[connection].value;
        //if the endpoint is not i, add it to nodes

        if(miserables.edges[connection].source.id != i){
          vertices.push(source);
          //vertices.push(jQuery.extend(true, {}, miserables.edges[connection].source));
          //console.log("source added:" + vertices[vertices.length - 1].id);
        } else {
          //the source is the clicked node, we add it only once
          if(!added){
            source.fx =  width3 / 2;
            source.fy = height3 / 2;
            vertices.push(source);
            added = true;
          }
        }

        if(miserables.edges[connection].target.id != i){
          vertices.push(target);
          //vertices.push(jQuery.extend(true, {}, miserables.edges[connection].target));
          //console.log("target added:" + vertices[vertices.length - 1].id);
        } else {
          //the target is the clicked node, we add it only once
          if(!added){
            target.fx =  width3 / 2;
            target.fy = height3 / 2;
            vertices.push(target);
            added = true;
          }
        }        
      }
    }

    //add the name
    svg3.append("text")
    .classed("nodelabel", true)
    .text(nodes[i].label)
    .attr("x", 0)
    .attr("y", 40);

    var degree = "Degree: " + (vertices.length - 1).toString();
    //add degree
    svg3.append("text")    
    .text(degree)
    .attr("x", 0)
    .attr("y", 55);  
       
    //add sum edges
    svg3.append("text")    
    .text("Sum edges: " + sumedges.toString())
    .attr("x", 0)
    .attr("y", 70);

    //only when we have many vertices we apply forces to the right and left
    if(vertices.length > 5){
      simulation2
      .force("right", d3.forceX(width3 * 0.75).strength(-0.27))
      .force("left", d3.forceX(width3 * 0.25).strength(-0.27));
    }

    //make a group for all links and a group for each link
    link2 = svg3.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(connections)
    .enter().append("g")
    .attr("source", function(d) { return d.source; } )
    .attr("target", function(d) { return d.target; } );

    //add lines to every group
    link2.append("line")
      .attr("stroke-width", 1);  

    //add a group for the nodes and a group for every node
    node2 = svg3.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(vertices)
      .enter().append("g")
      .attr("class", "node")
      .attr("id", function(d) { return d.id; } );

    //add circles to the node groups
    node2.append("circle")
      .attr("r", 10)
      .attr("fill", "black")
      .attr("group", function(d) {return d.group;})
      .attr("count", function(d) {return d.count;})
      .on("mouseover", showValue)
      .on("mouseout", hideValue)
      .on("click", function(d) {onNodeClick(d, d.id, false)})
      .style("cursor", "pointer");

    //add node labels (names)
    node2.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .classed("nodelabel", true)
        .text(function(d) {return d.label});

    //add node labels (values)
    node2.append("text")        
        .attr("text-anchor", "middle")        
        .attr("dy", ".35em")
        .attr("pointer-events", "none")
        .classed("nodecount", true)
        .text(function(d) {return d.count});

    //add this as the last because it should always be drawn on top    
    linklabels = svg3.append("g")
        .attr("class", "linklabels")
        .selectAll("text")
        .data(connections)
        .enter().append("text")
      .attr("text-anchor", "middle")                
        .classed("edgecount", true)
        .classed("link", true)
        .attr("source", function(d) { return d.source; } )
        .attr("target", function(d) { return d.target; } )
        .style("opacity", 0)        
        .text(function(d) {return d.value});    

    simulation2
        .nodes(vertices)
        .on("tick", ticked2);

    simulation2.force("link")
        .links(connections);

    recolorfg(false);
  }

  function setFocusGraphEdge(x, y, e){
    console.log("setFocusEdge, x: " + x + ", y: " + y);
    console.log("x object: " + JSON.stringify(nodes[x], null, 4));
    console.log("y object: " + JSON.stringify(nodes[y], null, 4));
    console.log("edge: " + JSON.stringify(e, null, 4));

    e.source = e.x;
    e.target = e.y;

    //clear the svg
    svg3.selectAll("*").remove();

    //add tooltip image
    svg3.append("svg:image")
     .attr('x',0)
     .attr('y',0)
     .attr('width', 24)
     .attr('height', 24)
     .attr("xlink:href","http://images.clipartpanda.com/question-mark-icon-Question-Mark-Icon.jpg")
     .on("mouseover", function(d) {        

         tip.transition()
           .duration(200)
           .style("opacity", .9);

         tip.html("-Values in the nodes represent the number of occurrences.<br/>-Hover over a node to see the number of occurrences of the related edge(s).<br/>-Click on a node to focus on that person.")
           .style("left", 788 + "px")
           .style("top", 495 + "px");
      })
      .on("mouseout", function(d) {
         tip.transition()
           .duration(500)
           .style("opacity", 0);
      });

    simulation2 = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge2", d3.forceManyBody().strength(0));
    


    vertices = [];
    connections = [];    

    vertices.push(jQuery.extend(true, {}, nodes[x]));
    vertices.push(jQuery.extend(true, {}, nodes[y]));
    connections.push(jQuery.extend(true, {}, e));

    vertices[0].fy = height3 / 2;
    vertices[0].fx = width3 * 0.6; 
    vertices[0].pos = "right";
    vertices[1].pos = "left";

    //make a group for all links and a group for each link
    link2 = svg3.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(connections)
    .enter().append("g")
    .attr("source", function(d) { return d.source; } )
    .attr("target", function(d) { return d.target; } );

    //add lines to every group
    link2.append("line")
      .attr("stroke-width", 2);  

    //add a group for the nodes and a group for every node
    node2 = svg3.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(vertices)
      .enter().append("g")
      .attr("class", "node")
      .attr("id", function(d) { return d.id; } );

    //add circles to the node groups
    node2.append("circle")
      .attr("r", 10)
      .attr("fill", "black")
      .attr("group", function(d) {return d.group;})
      .attr("count", function(d) {return d.count;})
      .on("click", function(d) {onNodeClick(d, d.id, false)})
      .style("cursor", "pointer");

    //add node labels (names)
    node2.append("text")
        .attr("dx", function(d) {return (d.pos == "right") ? 12 : -12})
        .attr("text-anchor", function(d) {return (d.pos == "right") ? "start" : "end"})
        .attr("dy", ".35em")
        .classed("nodelabel", true)
        .text(function(d) {return d.label});

    //add node labels (values)
    node2.append("text")        
        .attr("text-anchor", "middle")        
        .attr("dy", ".35em")
        .attr("pointer-events", "none")
        .classed("nodecount", true)
        .text(function(d) {return d.count});

    //add this as the last because it should always be drawn on top    
    linklabels = svg3.append("g")
        .attr("class", "linklabels")
        .selectAll("text")
        .data(connections)
        .enter().append("text")
      .attr("dy", -3)
      .attr("text-anchor", "middle")                
        .classed("edgecount", true)
        .classed("link", true)
        .attr("source", function(d) { return d.source; } )
        .attr("target", function(d) { return d.target; } )
        .style("opacity", 1)        
        .text(function(d) {return d.z});    

    simulation2
        .nodes(vertices)
        .on("tick", ticked2);

    simulation2.force("link")
        .links(connections);

    simulation2    
    .force("left", d3.forceX(width3 * 0.25).strength(0.3));

    recolorfg(false);
  }

  //recolors the fg, we do this separate because it needs to happen more often
  function recolorfg(delay){
    dur = (delay) ? 750 : 0;
    
    svg3.selectAll("circle")
      .transition()
      .duration(dur)
      .attr("fill", function(d) { return (coloring.value == "group") ?  c(d.group) : c(d.count); })
  }

  function ticked2() {  
    //move the lines    
    link2
        .select("line")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    //move the labels on the lines
    linklabels        
        .attr("x", function(d) {return (d.source.x + d.target.x) / 2})
        .attr("y", function(d) {return (d.source.y + d.target.y) / 2})

    //move the nodes
    node2
        .select("circle")
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

    //move the text in the nodes
    node2
        .selectAll("text")
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; });
    
  }

  function showValue(v){
    console.log("mouseover" + v.id);
    //show the link value
    svg3.selectAll(".link")
    .filter(function(d) { return v.id == d.source.id || v.id == d.target.id })    
    .style("opacity", 1);
  }

  function hideValue(d){
    //hide all link values
    svg3.selectAll(".link")
    .style("opacity", 0);
  }

});

