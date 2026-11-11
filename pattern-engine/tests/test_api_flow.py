def test_full_analysis_and_matching_flow(client):
    # 1. Analyze design
    resp = client.post(
        "/designs/analyse",
        data={"customer_notes": "Please make it modest and comfortable."}
    )
    assert resp.status_code == 200
    data = resp.json()
    design_id = data["design_id"]
    assert data["analysis"]["garment_type"]["value"] == "dress"
    assert data["analysis"]["silhouette"]["value"] == "fitted"
    # Nulls for unknowns
    assert data["analysis"]["closure"]["value"] is None
    assert data["analysis"]["closure"]["status"] == "needs_confirmation"
    # Customer instruction kept separate
    assert "Please make it modest and comfortable." in data["analysis"]["customer_instructions"]

    # 2. Match template
    match_resp = client.post(f"/designs/{design_id}/match")
    assert match_resp.status_code == 200
    match_data = match_resp.json()
    assert match_data["matched_template"] == "dress_basic_v1"

    # 3. Check missing fields
    missing_resp = client.get(f"/designs/{design_id}/missing")
    assert missing_resp.status_code == 200
    missing_data = missing_resp.json()
    assert "bust" in missing_data["required_from_customer"]["body_measurements"]

    # 4. Calculate with test-only rules
    calc_resp = client.post(
        f"/designs/{design_id}/calculate",
        json={
            "bust": 92.0,
            "waist": 74.0,
            "hip": 98.0,
            "dress_length": 105.0,
            "allow_test_rules": True
        }
    )
    assert calc_resp.status_code == 200
    calc_data = calc_resp.json()
    assert calc_data["status"] in ("success", "complete", "complete_with_test_data", "complete_with_reference_data")
    assert calc_data["measurements"]["bust"]["garment_cm"] == 96.0 # 92 + 4

    # 5. Fetch full design details
    details_resp = client.get(f"/designs/{design_id}")
    assert details_resp.status_code == 200
    details = details_resp.json()
    assert details["id"] == design_id
    assert details["current_version"]["calculated_measurements"]["measurements"]["bust"]["garment_cm"] == 96.0

    # 6. Record tailor correction
    corr_resp = client.post(
        f"/designs/{design_id}/correct",
        json={
            "field": "neckline",
            "old_value": "square",
            "new_value": "v_neck",
            "cause": "misread_image",
            "created_by": "tailor"
        }
    )
    assert corr_resp.status_code == 200
    corr_data = corr_resp.json()
    assert corr_data["confirmed_choices"]["neckline"] == "v_neck"

    # 7. Render SVG technical flat drawing
    svg_resp = client.get(f"/designs/{design_id}/drawing")
    assert svg_resp.status_code == 200
    assert "image/svg+xml" in svg_resp.headers["content-type"]
    assert "<svg" in svg_resp.text
    assert "Finished bust: 96.0 cm" in svg_resp.text

    # 8. Export HTML tech pack blueprint
    html_resp = client.get(f"/designs/{design_id}/export/html")
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers["content-type"]
    assert f"Astra Tech Pack: {design_id}" in html_resp.text
