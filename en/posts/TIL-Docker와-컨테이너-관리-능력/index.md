---
layout: "post"
title: "[TIL] Docker and container management capabilities"
date: 2026-06-05 09:00:00 +0900
last_modified_at: 2026-06-05 20:59:00 +0900
categories: ["Spring 단기 심화", "심화 주차"]
tags: ["TIL", "Docker"]
description: "By studying the basic concepts of Docker and how to manage containers, I understood the reason for maintaining a consistent application execution environment."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Docker와-컨테이너-관리-능력/"
original_url: "/posts/TIL-Docker와-컨테이너-관리-능력/"
notion_id: "3767788a-fc66-805f-b246-ffcc7f2ee6fc"
notion_lang: "en"
---
## Concepts learned today

- Docker: A tool that manages application execution environments by grouping them into containers.

- Container: Unit of running application

- Image: Blueprint for creating a container

- Docker Compose: Allows you to run and manage multiple containers together with a single configuration file.

<hr>

Docker is a tool that binds the environment where applications run into one independent space.

In the local environment, the operating system, Java version, DB settings, environment variables, etc. may vary from person to person, but using Docker, the execution environment can be defined as an image and executed as a container, thereby reducing problems due to environmental differences.

In particular, when developing a back-end application, it is often necessary to run multiple components such as DB, Redis, message queue, and monitoring tools together, rather than running only an application server. At this time, if you execute each directly with the `docker run` command, management becomes complicated because you have to remember the port, environment variables, and network settings one by one.

Docker Compose allows you to define multiple containers in one configuration file and run them at once to solve this problem.

## Difference between image and container

The most basic concept I reaffirmed while solving today's problem was the difference between an image and a container.

An image is close to an executable template or blueprint for creating a container. It may include application code, libraries required for execution, runtime environment, etc.

On the other hand, a container is an instance that is actually executed based on this image.

To use an analogy, the image is a bungeoppang mold, and the container can be seen as a bungeoppang made with that mold. Multiple containers can be created from the same image, and each container runs independently. Therefore, even if you use the same application image, you can run containers with different settings by specifying different ports or environment variables.

This concept was also important in problem solving. Deleting a container does not delete the image; the image remains, so you can create a container again with the same image. In other words, it is important to distinguish that a container is an execution unit and an image is the source for execution.

## Why use Docker composeDocker compose is used to manage multiple containers as a single application bundle.

For example, if there are Service A and Service B, and Service A needs to call Service B, it is not enough to run the two containers separately. The two containers must be on the same network, and they must also decide what names to call each other.

You can use the `docker run` command directly, but the more containers there are, the longer the command becomes and the easier it is to make mistakes. This is because port mapping, environment variables, network connections, execution order, etc. must be manually entered each time. Using Docker Compose, you can organize these settings in a single YAML file and run multiple containers with a single `docker compose up` command.

In this respect, I felt that Docker Compose is not simply a convenient execution tool, but a tool that documents and makes the development environment reproducible. If team members use the Compose file together, they can run containers under the same conditions, which is a great advantage for collaboration.

## Meaning of port mapping

One of the parts that could be confusing when solving the problem was port mapping.

Even if the application is running on port 8080 inside the container, it does not mean that you can unconditionally access `localhost:8080` from your local browser. To access from outside, you must connect the host port and container port.

For example, the setting `18080:8080` means that requests coming from the `18080` port on my computer are forwarded to the `8080` port inside the container. Here, the front is the host port, and the back is the container port.

Understanding this concept, I was able to understand that even if multiple containers all use the `8080` port internally, they can run simultaneously by specifying different host ports. Conversely, if multiple containers try to use the same host port at the same time, a port conflict occurs.

## Setting environment variables

In Docker Compose, environment variables can be passed inside the container through the `environment` item.Environment variables are a way to externally inject necessary settings when an application runs. For example, addresses of other services, DB connection information, profile settings, etc. can be passed as environment variables.

In what we learned today, the flow of passing the address of Service B as an environment variable in a situation where Service A needs to call Service B was important. This way, you can inject different values ​​depending on the execution environment without fixing the address within the application code.

This approach was felt to be important in real operational environments as well. The DB address or external API address that must be accessed may be different for the development environment, test environment, and operating environment. If you put these values ​​directly in the code, you have to modify the code every time the environment changes, but if you separate them as environment variables, you can run them by simply changing the settings.

## Communicate service name with Docker Compose network

One of the most important concepts to understand today was the network in Docker Compose.

When you run Docker Compose, a bridge network is created based on the directory where the Compose file is located, and the services defined in Compose are included in the network.

Containers within the same Docker network can call each other by container name or service name. For example, when service A calls service B, you can access it using a service name such as `service-b` without directly knowing the IP address.

This part is also connected to the MSA structure. In a microservices environment, multiple services run independently, but ultimately must communicate with each other. Docker Compose makes it relatively easy to configure these inter-service communication structures in a local development environment.

If the container name does not work, check whether it belongs to the same network. If you run it directly with `docker run`, the network option may be omitted, so in this situation, you should first question the network settings.

## Role of depends_on

In Docker Compose, `depends_on` is an option that specifies the execution order between containers.

For example, if the application container depends on the DB container, you can configure the DB container to be created first and then the application container to run.However, while organizing today, I also learned something to be careful about. `depends_on` guarantees the creation order of containers, but does not guarantee that the service is completely ready. For example, even if the DB container is launched first, it may take time for the DB to actually become connectable. So, in a real environment, additional processing such as health checks or retry logic may be required.

When solving a problem, I felt that simply understanding this concept as ‘executed first’ was not enough, and that it was necessary to distinguish between ‘the order of creation and completion of preparation’.

## docker compose up and down

The most basic commands in Docker Compose are `up` and `down`.

`docker compose up` executes services defined in the Compose file. If you add the `-d` option here, it will run in the background. Background execution makes it more convenient to use during development because it does not continuously occupy the terminal.

Conversely, `docker compose down` organizes containers executed with Compose. Because you can stop and remove multiple containers at once, it is much more convenient than manually finding the container IDs and deleting them one by one.

What I felt while solving the problem today is that using Docker Compose not only makes it easier to run containers, but also makes the unit of execution and organization clearer. Because multiple containers can be managed as a single project, mistakes can be reduced even in complex development environments.

<hr>

## What I felt

Before today’s study, I felt that Docker was simply a “tool for running programs as containers.” However, as I learned Docker Compose, I came to understand more clearly that Docker is a tool for reproducing a development environment and reliably managing multiple services.

Especially in a structure where multiple services are divided, such as MSA, communication, network, and environmental variable management between services are important. Because Docker Compose allows you to manage these elements in a single configuration file, I found it useful when practicing the MSA structure locally or customizing a team project environment.Also, while solving the problem, I learned that there are many concepts that seem similar but must be accurately distinguished, such as image and container, host port and container port, container creation order and service preparation. In the future, when using Docker, I felt that I should use it while thinking about what problem each setting is intended to solve rather than simply memorizing commands.
