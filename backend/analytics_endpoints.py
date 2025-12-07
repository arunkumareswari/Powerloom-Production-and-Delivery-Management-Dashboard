# Analytics endpoint for production trend (line chart)
@app.get("/api/analytics/production-trend")
async def get_production_trend(days: int = 30):
    """Get daily production trend for the last N days"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get daily production data
        cursor.execute("""
            SELECT 
                DATE(d.delivery_date) as date,
                SUM(d.good_pieces) as good_pieces,
                SUM(d.damaged_pieces) as damaged_pieces,
                SUM(d.good_pieces + d.damaged_pieces) as total_pieces
            FROM deliveries d
            WHERE d.delivery_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY DATE(d.delivery_date)
            ORDER BY date ASC
        """, (days,))
        
        trend_data = cursor.fetchall()
        
        # Format for Recharts
        formatted_data = []
        for row in trend_data:
            formatted_data.append({
                "date": row['date'].strftime('%Y-%m-%d'),
                "good": row['good_pieces'] or 0,
                "damaged": row['damaged_pieces'] or 0,
                "total": row['total_pieces'] or 0
            })
        
        cursor.close()
        conn.close()
        
        return {"data": formatted_data}
        
    except Error as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))


# Analytics endpoint for fabric distribution (pie chart)
@app.get("/api/analytics/fabric-distribution")
async def get_fabric_distribution():
    """Get fabric type distribution"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT 
                b.fabric_type as name,
                SUM(d.good_pieces + d.damaged_pieces) as value,
                COUNT(DISTINCT b.id) as beam_count
            FROM beam_starts b
            LEFT JOIN deliveries d ON b.id = d.beam_id
            GROUP BY b.fabric_type
            ORDER BY value DESC
        """)
        
        fabric_data = cursor.fetchall()
        
        # Format for Recharts pie chart
        formatted_data = []
        for row in fabric_data:
            formatted_data.append({
                "name": row['name'] or 'Unknown',
                "value": row['value'] or 0,
                "beams": row['beam_count']
            })
        
        cursor.close()
        conn.close()
        
        return {"data": formatted_data}
        
    except Error as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
