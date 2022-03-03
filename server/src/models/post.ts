import getConnection from "../database/connect";
import {RowDataPacket} from "mysql2";
import {Expose} from "class-transformer";
import {IsBoolean, IsNumber, IsString} from "class-validator";
import {Connection} from "mysql2/promise";
import post from "../routes/post";

export class Post {
  @Expose()
  @IsNumber()
  post_id: number = -1;
  @Expose()
  @IsString()
  poster_username: string;
  @Expose()
  @IsString()
  category: string;
  @Expose()
  @IsString()
  title: string;
  @Expose()
  @IsBoolean()
  is_private: boolean = true;
  @IsString({each: true})
  tags: string[] = [];

  constructor(poster_username: string, category: string, title: string, is_private: boolean = true, tags: string[] = []) {
    this.post_id = -1;
    this.poster_username = poster_username;
    this.category = category;
    this.title = title;
    this.is_private = is_private;
    this.tags = tags;
  }

  async create(_connection?: Connection) {
    const connection = _connection ?? await getConnection();
    const query = "INSERT INTO post (poster_username, post_category, title, is_private) VALUES (?, ?, ?, ?)";
    try {
      await connection.execute(query, [this.poster_username, this.category, this.title, this.is_private]);
      const [lastID] = await connection.execute<RowDataPacket[]>("SELECT LAST_INSERT_ID() as id");
      this.post_id = lastID[0].id;
      if (this.tags.length > 0) {
        await connection.query("INSERT INTO post_tag (post_id, tag_name) VALUES ? ",
          [this.tags.map(tag => [lastID[0].id, tag])]);
      }
    } catch (e) {
      this.post_id = -1;
      throw e;
    }
  }

  async createWithTransaction() {
    const connection = await getConnection();
    await connection.beginTransaction();
    try {
      await this.create(connection);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    }
  }

  static async getTags<T extends Post>(posts: T[]): Promise<T[]> {
    if (post.length == 0) {
      return posts;
    }
    const connection = await getConnection();
    const [tags] = await connection.query<RowDataPacket[]>(
      `SELECT post_id, tag_name
       FROM post_tag
       where post_id IN (?)`, [posts.map(post => post.post_id)]);
    for (const tag of tags) {
      const post = posts.find(post => post.post_id === tag.post_id) as T;
      if (post) {
        if (post.tags != undefined) {
          post.tags.push(tag.tag_name);
        } else {
          post.tags = [tag.tag_name];
        }
      }
    }
    return posts;
  }

  static async getAllTags(category: string, auth: boolean): Promise<string[]> {
    const connection = await getConnection();
    const [tags] = await connection.query<RowDataPacket[]>(
      `SELECT distinct tag_name
       from post_tag,
            post
       where post.post_id = post_tag.post_id
         and post_category = ?
         and (is_private = false or ? = true)`, [category, auth]);
    return tags.map(tag => tag.tag_name);
  }
}
