var red_wine = [];
d3.csv("./wine/wine_red.csv", 
	function(data) {
		data.forEach(function(d) {
		    d["fixed acidity"] = +d["fixed acidity"];
		    d["volatile acidity"] = +d["volatile acidity"];
		    d["citric acid"] = +d["citric acid"];
		    d["residual sugar"] = +d["residual sugar"];
		    d["chlorides"] = +d["chlorides"];
		    d["free sulfur dioxide"] = +d["free sulfur dioxide"];
		    d["total sulfur dioxide"] = +d["total sulfur dioxide"];
		    d["density"] = +d["density"];
		    d["pH"] = +d["pH"];
		    d["sulphates"] = +d["sulphates"];
		    d["alcohol"] = +d["alcohol"];
		    d["quality"] = +d["quality"];
		    red_wine = d;
		});
	}
);

console.log(red_wine[0]);