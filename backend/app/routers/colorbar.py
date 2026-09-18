from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/colorbar", tags=["Colorbar"])

@router.get("/presets")
async def get_colorbar_presets():
    """Return a list of available color palette presets."""
    return {
        "presets": [
            {
                "id": "jet",
                "name": "Jet",
                "description": "Classic rainbow colormap (blue → cyan → green → yellow → red)",
                "colors": ["#00007F", "#0000FF", "#007FFF", "#00FFFF", "#7FFF7F",
                           "#FFFF00", "#FF7F00", "#FF0000", "#7F0000"],
            },
            {
                "id": "viridis",
                "name": "Viridis",
                "description": "Perceptually uniform, colorblind-friendly (purple → green → yellow)",
                "colors": ["#440154", "#482777", "#3F4A8A", "#31678E", "#26838F",
                           "#1F9D8A", "#6CCE5A", "#B6DE2B", "#FEE825"],
            },
            {
                "id": "turbo",
                "name": "Turbo",
                "description": "Improved rainbow with better perceptual uniformity",
                "colors": ["#30123B", "#4662D7", "#36AAF9", "#1AE4B6", "#72FE5E",
                           "#C8EF34", "#FABA39", "#F66B19", "#D23105"],
            },
            {
                "id": "inferno",
                "name": "Inferno",
                "description": "Dark-to-bright fire colormap (black → purple → orange → yellow)",
                "colors": ["#000004", "#1B0C41", "#4A0C6B", "#781C6D", "#A52C60",
                           "#CF4446", "#ED6925", "#FB9B06", "#F7D13D", "#FCFFA4"],
            },
            {
                "id": "coolwarm",
                "name": "Cool–Warm",
                "description": "Diverging blue → white → red (good for anomalies)",
                "colors": ["#3B4CC0", "#6788EE", "#9ABBFF", "#C9D7EF", "#EDDBD5",
                           "#F7B89C", "#F18060", "#D63A3A", "#B40426"],
            },
            {
                "id": "ocean",
                "name": "Ocean",
                "description": "Deep ocean theme (dark blue → teal → light blue)",
                "colors": ["#000033", "#000066", "#003366", "#006699", "#0099CC",
                           "#33CCCC", "#66FFFF", "#99FFFF", "#CCFFFF"],
            },
        ],
    }
