import csv
#from flask.cli import F
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

    points = np.array(points)

    # Deal with values equaling 0
    intensities = np.array(intensities) + 1e-10

    # Apply log_transformed
    log_transformed = np.log(intensities)

    # Normalize intensity values to the range [0, 1]
    min_intensity = min(log_transformed)
    max_intensity = max(log_transformed)
    log_transformed = (
        ((np.array(log_transformed) - min_intensity) / (max_intensity - min_intensity))
        .reshape(-1, 1)
        .repeat(3, axis=1)
    )
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)
    pcd.colors = o3d.utility.Vector3dVector(log_transformed)
    o3d.io.write_point_cloud(
        ply_filename, pcd.voxel_down_sample(voxel_size=0.006), write_ascii=False
    )


# Example usage:
'''
process_csv_to_ply("data/01_column.csv", "data/01_column.ply")
process_csv_to_ply("data/02_ground.csv", "data/02_ground.ply")
process_csv_to_ply("data/03_ground.csv", "data/03_ground.ply")
'''
process_csv_to_ply("public/data/04_groundKB526.csv", "public/data/04_groundKB526.ply")