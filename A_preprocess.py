import csv
from flask.cli import F
import numpy as np
import open3d as o3d
from tqdm import tqdm


def interpolate_color(value, low, high, color1, color2):
    """Interpolate between two colors."""
    ratio = (value - low) / (high - low)
    r = int(color1[0] + ratio * (color2[0] - color1[0]))
    g = int(color1[1] + ratio * (color2[1] - color1[1]))
    b = int(color1[2] + ratio * (color2[2] - color1[2]))
    return r, g, b


def intensity_to_rgb(intensity):
    """Map normalized intensity to an RGB color based on the gradient."""
    if intensity <= 0.333:
        return interpolate_color(intensity, 0.0, 0.333, (0, 0, 255), (0, 255, 0))  # Blue -> Green
    elif intensity <= 0.666:
        return interpolate_color(
            intensity, 0.333, 0.666, (0, 255, 0), (255, 255, 0)
        )  # Green -> Yellow
    else:
        return interpolate_color(intensity, 0.666, 1.0, (255, 255, 0), (255, 0, 0))  # Yellow -> Red


# Main function to process the CSV file, voxelize, and save to PLY
def process_csv_to_ply(csv_filename, ply_filename):
    points = []
    intensities = []

    # Read the CSV file
    with open(csv_filename, "r") as csvfile:
        csvreader = csv.reader(csvfile)
        for row in csvreader:
            try:
                x, y, z, intensity = map(float, row)
            except ValueError:
                continue
            points.append((x, y, z))
            intensities.append(intensity)

    # Normalize intensity values to the range [0, 1]
    min_intensity = min(intensities)
    max_intensity = max(intensities)

    with open(ply_filename, "w") as plyfile:
        plyfile.write("ply\n")
        plyfile.write("format ascii 1.0\n")
        plyfile.write(f"element vertex {len(points)}\n")
        plyfile.write("property float x\n")
        plyfile.write("property float y\n")
        plyfile.write("property float z\n")
        plyfile.write("property uchar red\n")
        plyfile.write("property uchar green\n")
        plyfile.write("property uchar blue\n")
        # plyfile.write("property float scarlar_intensity\n")
        plyfile.write("end_header\n")
        for (x, y, z), value in tqdm(zip(points, intensities), total=len(points)):
            if min_intensity == max_intensity:
                r, g, b = intensity_to_rgb(0.5)
            else:
                r, g, b = intensity_to_rgb(
                    (value - min_intensity) / (max_intensity - min_intensity)
                )
            plyfile.write(f"{x} {y} {z} {r} {g} {b}\n")
    with open(ply_filename.replace("ply", "txt"), "w") as plyfile:
        for intensity in intensities:
            plyfile.write(f"{intensity}\n")


# Example usage:
process_csv_to_ply("data/02_ground.csv", "data/02_ground.ply")
