import open3d as o3d
import numpy as np


def voxel_downsample_with_indices(pcd, voxel_size):
    colors = np.array(pcd.colors)
    points = np.array(pcd.points)
    # Calculate the voxel indices for each point
    voxel_indices = np.floor(points / voxel_size).astype(np.int32)

    # Use a dictionary to store the first occurrence of each voxel
    voxel_dict = {}
    downsampled_points = []
    original_indices = []

    for idx, voxel_index in enumerate(voxel_indices):
        # Convert voxel index to a tuple so it can be used as a dictionary key
        voxel_key = tuple(voxel_index)

        if voxel_key not in voxel_dict:
            voxel_dict[voxel_key] = idx
            downsampled_points.append(points[idx])
            original_indices.append(idx)

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(np.array(downsampled_points))
    pcd.colors = o3d.utility.Vector3dVector(np.array(colors[original_indices]))
    return pcd, np.array(original_indices)


INPUT = "data/02_ground.ply"
pcd = o3d.io.read_point_cloud(INPUT)
intensity = np.loadtxt(INPUT.replace(".ply", ".txt"))
sample_pcd, index = voxel_downsample_with_indices(pcd, 0.005)


o3d.io.write_point_cloud(
    INPUT.replace(".ply", "_downsample.ply"), o3d.geometry.PointCloud(sample_pcd)
)
np.savetxt(INPUT.replace(".ply", "_downsample.txt"), intensity[index],  fmt='%.6f')
