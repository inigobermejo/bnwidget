HTMLWidgets.widget({

  name: "bnwidget",

  type: "output",
    
  initialize: function(el, width, height) {
    svg = d3.select(el).append("svg")
    .attr("width", width)
    .attr("height", height);
    
    if (HTMLWidgets.shinyMode) {
      Shiny.onInputChange("selectedNode", "-");
    }
          
    // init D3 force layout
    var collisionForce = d3.forceCollide(75).strength(1).iterations(50);
    return d3.forceSimulation()
               .alphaDecay(0.01)
               .force("center", d3.forceCenter(width / 2, height / 2))
               .force("collisionForce", collisionForce);
  },
  
    resize: function(el, width, height, simulation) {
    
    d3.select(el).select("svg")
        .attr("width", width)
        .attr("height", height);

    simulation.force("center", d3.forceCenter(width / 2, height / 2))
        .restart();
  },

  renderValue: function(el, x, simulation) {
        
    // convert links and nodes data frames to d3 friendly format
    var links = HTMLWidgets.dataframeToD3(x.links);
    var nodes = HTMLWidgets.dataframeToD3(x.nodes);
    var node_states = x.node_states;
    var cpds = x.cpds; // HTMLWidgets.dataframeToD3(x.cpds);
    var settings = x.settings;
      
    simulation
      .force("charge", d3.forceManyBody().strength(settings.charge))
      .on("tick", tick);
    
    simulation
      .nodes(nodes);
    
    simulation
      .force("link", d3.forceLink(links).id(function(d) { return d.name; }))    
    //simulation
    //  .force("link")
    //  .links(links);
      
    simulation
      .force("link").distance(settings.linkDistance)
        
    simulation.alpha(1).restart();
    
    // select the svg element
    var svg = d3.select(el).select("svg");
    svg.selectAll("*").remove();
    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
      .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#000');
    
    // listen to mouse events
    svg.on('mousedown', mousedown)
      .on('mousemove', mousemove)
      .on('mouseup', mouseup);
      
    svg =  svg.append("g").attr("class","zoom-layer")
        .append("g")
        
    var zoom = d3.zoom();
    
    // add zooming if requested
    if (settings.zoom) {
      function redraw() {
        d3.select(el).select(".zoom-layer")
          .attr("transform", d3.event.transform);
      }
      zoom.on("zoom", redraw)

      d3.select(el).select("svg")
        .attr("pointer-events", "all")
        .call(zoom);

    } else {
      zoom.on("zoom", null);
    }
    
    // line displayed when dragging new nodes
    var dragLine = svg.append('svg:path')
                       .attr('class', 'dragline hidden')
                       .attr('d', 'M0,0L0,0');
  
    // init D3 drag support
    var dragNode = d3.drag()
    .on('start', function(d){
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();

      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', function(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    })
    .on('end', function(d) {
      if (!d3.event.active) simulation.alphaTarget(0);

      d.fx = null;
      d.fy = null;
    });
    var bajsNet = new BajsianNetwork(links, nodes, cpds);
    
    // mouse event vars
    var selectedNode = null;
    var selectedLink = null;
    var mousedownLink = null;
    var mousedownNode = null;
    var mouseupNode = null;
    
    restart();
    
    ////////////////////////////
    // functions
    ////////////////////////////
    // reset mouse variables
    function resetMouseVars() {
      mousedownNode = null;
      mouseupNode = null;
      mousedownLink = null;
    }

    // update force layout
    function tick() {
      var linkElements = svg.selectAll('.link');
      var nodeElements = svg.selectAll('.node');
      
      // draw links with proper padding
      linkElements.attr('d', function(d) {
        var sourceX = d.source.x + d.source.width / 2;
        var sourceY = d.source.y + d.source.height / 2;
        var targetX = d.target.x + d.target.width / 2;
        var targetY = d.target.y + d.target.height / 2;
      
        var newSource = intersectPointRect(targetX, targetY, sourceX, sourceY, d.source.width, d.source.height);
        var newTarget = intersectPointRect(sourceX, sourceY, targetX, targetY, d.target.width, d.target.height);

        return "M"+ newSource.x +","+ newSource.y +"L"+ newTarget.x +","+ newTarget.y;
      });
      // draw nodes
      nodeElements.attr('transform', function(d) { return "translate(" + d.x + "," + d.y + ")"});
    }

    // update graph (called when needed)
    function restart() {
      var linkElements = svg.selectAll('.link');
      var nodeElements = svg.selectAll('.node'); 
      
      linkElements = linkElements.data(links);
      
      // update existing links
      linkElements
        .selectAll('path')
        .classed('selected', function(d) { return d === selectedLink;})
        .style('marker-start', '')
        .style('marker-end', 'url(#end-arrow)');

      // remove old links
      linkElements.exit().remove();

      // add new links
      linkElements = linkElements.enter().append('path')
        .attr('class', 'link')
        .style("stroke", '#000')
        .style("fill", 'none')
        .style("stroke-width", function(d) {return (d === selectedLink)? '5px' : '4px';})
        .style('marker-end', 'url(#end-arrow)')
        .on('mousedown', function(d) {
          if (d3.event.ctrlKey) return;

          // select link
          mousedownLink = d;
          selectedLink = (mousedownLink === selectedLink) ? null : mousedownLink;
          selectedNode = null;
          restart();
        })
        .on("mouseover", function(d) {
          d3.select(this)
            .style("opacity", 1);
        })
        .on("mouseout", function(d) {
          d3.select(this)
            .style("opacity", settings.opacity);
        }).merge(linkElements);

      // NB: the function arg is crucial here! nodes are known by name, not by index!
      nodeElements = nodeElements.data(nodes, function(d) { return d.name;});

      // update existing nodes (reflexive & selected visual states)
      nodeElements.selectAll('rect')
        .style('fill', function(d) {return (d === selectedNode) ? d3.rgb('#F2D398').brighter().toString() : '#F2D398';})

      // remove old nodes
      nodeElements.exit().remove();

      // add new nodes
      var newNodes = nodeElements
        .enter()
        .append('g')
        .attr('class', 'node');

      newNodes.append('svg:rect')
        .attr('width', function(d) { 
                          return Math.max(textWidth(d.name, "12px sans-serif") + 30, d.width); 
         })
        .attr('height', function(d) { return d.height; })
        .attr('rx', 5)
        .attr('ry', 5)
        .style('fill', '#F2D398') //function(d) {(d === selectedNode) ? d3.rgb('#F2D398').brighter().toString() : '#F2D398';})
        .style('stroke', function(d) {return d3.rgb('#F2D398').darker().toString();})
        .style("stroke-width", "2px")

        newNodes
        .on('mouseover', function (d) {
          //if (!mousedownNode || d === mousedownNode) return;
          // make border wider
          d3.select(this).selectAll("rect").style("stroke-width", "3px");
         })
        .on('mouseout', function (d) {
          //if (!mousedownNode || d === mousedownNode) return;
          // turn border back to normal
          d3.select(this).selectAll("rect").style("stroke-width", "2px");
        })
        .on('dblclick', function (d) {
          //if (!mousedownNode || d === mousedownNode) return;
          // turn border back to normal
          d3.select(this).selectAll("rect").style("fill", '#FFFFFF');
        })
        .on('mousedown', function(d) {
          if (d3.event.ctrlKey) return;

          // select node
          mousedownNode = d;
          selectedNode = (mousedownNode === selectedNode) ? null : mousedownNode;
          selectedLink = null;
          
          if (HTMLWidgets.shinyMode) {
            Shiny.onInputChange("selectedNode", mousedownNode.name);
          }

          // reposition drag line
          mousedownNodeX = mousedownNode.x + mousedownNode.width / 2;
          mousedownNodeY = mousedownNode.y + mousedownNode.height / 2;
          dragLine
            .style('marker-end', 'url(#end-arrow)')
            .classed('hidden', false)
            .attr('d', "M" + mousedownNodeX +","+ mousedownNodeY +"L"+ mousedownNodeX +","+ mousedownNodeY);

          restart();
        })
        .on('mouseup', function (d) {
          if (!mousedownNode) return;

          // needed by FF
          dragLine
            .classed('hidden', true)
            .style('marker-end', '');

          // check for drag-to-self
          mouseupNode = d;
          if (mouseupNode === mousedownNode) {
            resetMouseVars();
            return;
          }

          // return node edge back to normal width
          d3.select(this).style("stroke-width", "3px");

          // add link to graph (update if exists)
          var source = mousedownNode;
          var target = mouseupNode;

          var link = links.filter(function(l) {return l.source === source && l.target === target;})[0];
          //if (!link) {
          //  links.push([source, target]);
          //}

          // select new link
          selectedLink = link;
          selectedNode = null;
          restart();
        })
        .call(dragNode);

      // show node names
      newNodes.append('text')
        .attr('x', 15)
        .attr('y', 15)
        //.attr('textLength', function(d) { return d.width;})
        .attr('class', 'id')
        .text(function(d) { return d.name;})
        .style("pointer-events", "none")
        .style("font", "12px sans-serif")
        .style("text-anchor", "left")
        
      newNodes  
        .append('g')
        .selectAll('text')
        .data(function(d){return node_states[d.name]})
        .enter()
        .append('text')
        .attr('x', 15)
        .attr('y', function(d, i){return 30 + i * 20;})
        .text(function(d) { return d;})
        .style("font", "12px sans-serif")
        .style("text-anchor", "left");
      
        
      nodeElements = newNodes.merge(nodeElements);
      
      //nodeElements.selectAll('rect')
      //  .attr('width', )

      // set the graph in motion
      simulation
        .nodes(nodes)
        .force('link').links(links);

      simulation.alphaTarget(0.3).restart();
    }
    
    function textWidth(string, font)
    {
      // re-use canvas object for better performance
      var canvas = textWidth.canvas || (textWidth.canvas = document.createElement("canvas"));
      var context = canvas.getContext("2d");
      context.font = font;
      var metrics = context.measureText(string);
      return metrics.width;
    }
    
    function mousedown() {
      // because :active only works in WebKit?
      svg.classed('active', true);

      if (mousedownNode || mousedownLink) return;

      if(d3.event.ctrlKey) {
        // insert new node at point
        const point = d3.mouse(this);
        const node = { id: ++lastNodeId, x: point[0], y: point[1], width: node_width, height: node_height };
        nodes.push(node);
        }

      restart();
    }

    function mousemove() {
      if (!mousedownNode) return;

      xx = mousedownNode.x + mousedownNode.width / 2;
      yy = mousedownNode.y + mousedownNode.height / 2;
      // update drag line
      dragLine.attr('d', "M"+ xx +","+ yy +"L"+ d3.mouse(this)[0]+","+ d3.mouse(this)[1]);

      restart();
    }

    function mouseup() {
      if (mousedownNode) {
        // hide drag line
        dragLine
          .classed('hidden', true)
          .style('marker-end', '');
      }

      // because :active only works in WebKit?
      svg.classed('active', false);

      // clear mouse event vars
      resetMouseVars();
    }
    
    
    // Returns intersection point between the line starting at pointX, pointY and a
    // rectangle centered at (rectX, rectY) with height rectH and width rectW
    function intersectPointRect(pointX, pointY, rectX, rectY, rectW, rectH) {
      var s = (pointY - rectY)/(pointX - rectX);
      var x = pointX;
      var y = pointY;
      if(-rectH/2 <= s * rectW/2 && s * rectW/2 <= rectH/2) { // then the line intersects
        if(pointX > rectX) // The right edge
        {
         x = rectX + rectW/2;
         y = rectY + s * rectW/2;
        }
        else // the left edge
        {
         x = rectX - rectW/2;
         y = rectY - s * rectW/2;
        }
      }
      if(-rectW/2 <= (rectH/2)/s && (rectH/2)/s <= rectW/2) // then the line intersects
      {
        if(pointY > rectY) // The top edge
        {
           y = rectY + rectH/2;
         x = rectX + (rectH/2)/s;
        }
        else // the bottom edge
        {
         y = rectY - rectH/2;
         x = rectX - (rectH/2)/s;
        }
      }
      // if the point is inside the rectangle, return pointX and pointY
      return {x:x, y:y};
    }
  
  },  
});
